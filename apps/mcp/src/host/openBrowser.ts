import { spawn, type ChildProcess } from "node:child_process";

import {
	calcBrowserOpenCommands,
	calcBrowserOpenPreference,
} from "./browserOpenCommands";
import type {
	BrowserOpenCommand,
	BrowserOpenMode,
} from "./browserOpenCommands";

/** How to open, and the callbacks reporting how the launch went */
export type BrowserOpenOptions = {
	/**
	 * How to open. When omitted, the environment variable
	 * `JISCRIBE_MCP_BROWSER` decides (app by default)
	 */
	mode?: BrowserOpenMode;
	/**
	 * The executable to name in app and headless mode. When omitted, the known
	 * Chromiums are looked for
	 */
	browserCommand?: string;
	/**
	 * Called with every process actually spawned, the last call naming the one
	 * that stuck. Only headless has a use for it, as the browser it spawns is the
	 * browser itself and can be killed as a last resort
	 */
	onSpawn?: (child: ChildProcess) => void;
	/**
	 * Called once, when there was not one candidate to try or every one of them
	 * failed. It carries the same reason that goes to the log
	 */
	onFailure?: (reason: string) => void;
};

/**
 * Tries the candidates in order. A missing executable (ENOENT) or an abnormal exit
 * drops to the next, and once they run out it warns and gives up.
 *
 * The exit code is looked at as well because an app-mode candidate can fail in the
 * shape of "it launches, but there is nothing to launch" (macOS's `open -na`,
 * Windows's `start`). A browser that did open either does not exit until the window
 * is closed, or hands over to an existing process and leaves with 0.
 */
const spawnFirstAvailable = (
	commands: readonly BrowserOpenCommand[],
	index: number,
	options: {
		onAdvance: (nextIndex: number) => void;
		onSpawn: (child: ChildProcess) => void;
		onExhausted: (reason: string) => void;
		/**
		 * Whether to let the child outlive this process. A headless browser has no
		 * one to close it, so it is kept attached
		 */
		shouldUnref: boolean;
	},
): void => {
	const [command, ...args] = commands[index];
	let isSettled = false;
	const fallBack = (reason: string): void => {
		if (isSettled) {
			return;
		}
		isSettled = true;
		if (index + 1 < commands.length) {
			options.onAdvance(index + 1);
			spawnFirstAvailable(commands, index + 1, options);
			return;
		}
		options.onExhausted(reason);
	};
	try {
		const child = spawn(command, args, { stdio: "ignore" });
		options.onSpawn(child);
		child.on("error", (error) => {
			fallBack(String(error));
		});
		child.on("exit", (code) => {
			// code is null when it died on a signal, and when it never launched at
			// all. The latter arrives separately as error, so nothing is decided here
			if (code === 0) {
				isSettled = true;
				return;
			}
			if (code !== null) {
				fallBack(`${command} exited with ${code}`);
			}
		});
		if (options.shouldUnref) {
			child.unref();
		}
	} catch (error) {
		fallBack(String(error));
	}
};

/**
 * Words the failure of every headless candidate so it reads as "no Chromium",
 * not as the last path tried being the one that is missing.
 *
 * @param commands The candidates that were tried, in order
 * @param lastReason The failure of the last of them, as spawn reported it
 */
const describeHeadlessExhaustion = (
	commands: readonly BrowserOpenCommand[],
	lastReason: string,
): string => {
	const hint = "name an executable with JISCRIBE_MCP_BROWSER";
	if (commands.length === 1) {
		return `the Chromium named for headless mode, ${commands[0][0]}, could not be started (${lastReason}); ${hint}`;
	}
	return `none of the ${commands.length} Chromium candidates for headless mode could be started, so none seems to be installed (the last one tried failed with: ${lastReason}); ${hint}`;
};

/**
 * Opens a URL in a browser. A failure to launch stays in the log and is never
 * thrown; `onFailure` is there for a caller that has to act on it (the headless
 * window, whose whole point is that the AI can then see nothing).
 *
 * In a stdio MCP server stdout is the JSON-RPC channel, so the log goes to stderr.
 *
 * @param url The URL to open
 * @param options How to open, and the callbacks that report the launch. Passing
 *   none opens the way `JISCRIBE_MCP_BROWSER` says to (app mode by default)
 */
export function openBrowser(
	url: string,
	options: BrowserOpenOptions = {},
): void {
	const preference = calcBrowserOpenPreference(
		process.env.JISCRIBE_MCP_BROWSER,
	);
	const mode = options.mode ?? preference.mode;
	const commands = calcBrowserOpenCommands(
		url,
		process.platform,
		mode,
		options.browserCommand ?? preference.browserCommand,
	);
	const reportFailure = (reason: string): void => {
		console.error(`Failed to open browser: ${reason}`);
		options.onFailure?.(reason);
	};
	if (commands.length === 0) {
		reportFailure(
			"no Chromium executable was found to run headless (name one with JISCRIBE_MCP_BROWSER)",
		);
		return;
	}
	// Running out of app-mode candidates drops to a tab. That is not an error, only a
	// window that looks different, so where it dropped is left on the record
	const appCommandCount =
		mode === "app"
			? commands.length -
				calcBrowserOpenCommands(url, process.platform, "tab").length
			: 0;
	spawnFirstAvailable(commands, 0, {
		onAdvance: (nextIndex) => {
			if (nextIndex === appCommandCount && appCommandCount > 0) {
				console.error(
					"No Chromium found for app mode; opening in the default browser instead (set JISCRIBE_MCP_BROWSER to name one).",
				);
			}
		},
		onSpawn: (child) => {
			options.onSpawn?.(child);
		},
		onExhausted: (lastReason) => {
			reportFailure(
				mode === "headless"
					? describeHeadlessExhaustion(commands, lastReason)
					: lastReason,
			);
		},
		shouldUnref: mode !== "headless",
	});
}
