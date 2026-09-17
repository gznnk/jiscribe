import type { ChildProcess } from "node:child_process";

import {
	calcBrowserOpenCommands,
	calcBrowserOpenPreference,
} from "./browserOpenCommands";
import type {
	BrowserOpenCommand,
	BrowserOpenMode,
} from "./browserOpenCommands";
import { createHeadlessProfile, type HeadlessProfile } from "./headlessProfile";
import { spawnFirstAvailable } from "./spawnFirstAvailable";

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
 * Says that the browsers on the Windows side were left out, and why. A launch
 * that went ahead without them is not the launch the caller asked for, so the
 * reason travels with every failure rather than being left in the log.
 *
 * @param profile The profile the launch was given, or null outside headless mode
 * @returns The sentence to append, or "" when nothing was left out
 */
const describeWindowsExclusion = (profile: HeadlessProfile | null): string => {
	if (profile === null || profile.paths.windows.ok) {
		return "";
	}
	return `; the Windows-side browsers were left out of the attempt, because ${profile.paths.windows.reason}`;
};

/**
 * Words the failure of every headless candidate so it reads as "no Chromium",
 * not as the last path tried being the one that is missing.
 *
 * @param commands The candidates that were tried, in order. Never empty
 * @param lastReason The failure of the last of them, as spawn reported it
 * @param profile The profile the launch was given, so that candidates left out for
 *   want of one are accounted for too
 */
const describeHeadlessExhaustion = (
	commands: readonly BrowserOpenCommand[],
	lastReason: string,
	profile: HeadlessProfile | null,
): string => {
	const hint = "name an executable with JISCRIBE_MCP_BROWSER";
	const exclusion = describeWindowsExclusion(profile);
	if (commands.length === 1) {
		return `the Chromium named for headless mode, ${commands[0][0]}, could not be started (${lastReason}); ${hint}${exclusion}`;
	}
	return `none of the ${commands.length} Chromium candidates for headless mode could be started, so none seems to be installed (the last one tried failed with: ${lastReason}); ${hint}${exclusion}`;
};

/**
 * Ties the throwaway profile's lifetime to the browser using it. Every candidate
 * of one launch is named the same directory, so it is taken away only once the
 * last one to be tried is gone; a candidate that dropped out has handed it on.
 *
 * @param profile The profile named on the command line of every candidate
 * @returns What to call with each process spawned, in the order they are tried
 */
const createProfileKeeper = (
	profile: HeadlessProfile,
): ((child: ChildProcess) => void) => {
	let latestChild: ChildProcess | null = null;
	return (child) => {
		latestChild = child;
		child.once("close", () => {
			if (child === latestChild) {
				profile.remove();
			}
		});
	};
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
	// A headless launch gets a profile of its own. Left on the user's, it contends
	// with the browser they already have open (see headlessProfile)
	let profile: HeadlessProfile | null = null;
	const reportFailure = (reason: string): void => {
		profile?.remove();
		console.error(`Failed to open browser: ${reason}`);
		options.onFailure?.(reason);
	};
	if (mode === "headless") {
		try {
			profile = createHeadlessProfile(process.platform);
		} catch (error) {
			// Making the directory is the one step here that can fail outright, and
			// a failure reaches the caller the way every other one does
			reportFailure(
				`no throwaway profile directory could be made for a headless browser (${String(error)})`,
			);
			return;
		}
	}
	const keepProfileWith =
		profile === null ? null : createProfileKeeper(profile);
	const commands = calcBrowserOpenCommands(
		url,
		process.platform,
		mode,
		options.browserCommand ?? preference.browserCommand,
		profile?.paths,
	);
	if (commands.length === 0) {
		reportFailure(
			`no Chromium executable was left to run headless (name one with JISCRIBE_MCP_BROWSER)${describeWindowsExclusion(profile)}`,
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
			keepProfileWith?.(child);
		},
		onExhausted: (lastReason) => {
			reportFailure(
				mode === "headless"
					? describeHeadlessExhaustion(commands, lastReason, profile)
					: lastReason,
			);
		},
		isChildTheBrowser: mode === "headless",
	});
}
