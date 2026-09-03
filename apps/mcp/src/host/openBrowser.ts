import { spawn } from "node:child_process";

import {
	calcBrowserOpenCommands,
	calcBrowserOpenPreference,
} from "./browserOpenCommands";
import type {
	BrowserOpenCommand,
	BrowserOpenMode,
} from "./browserOpenCommands";

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
	onAdvance: (nextIndex: number) => void,
): void => {
	const [command, ...args] = commands[index];
	let isSettled = false;
	const fallBack = (reason: string): void => {
		if (isSettled) {
			return;
		}
		isSettled = true;
		if (index + 1 < commands.length) {
			onAdvance(index + 1);
			spawnFirstAvailable(commands, index + 1, onAdvance);
			return;
		}
		console.error(`Failed to open browser: ${reason}`);
	};
	try {
		const child = spawn(command, args, { stdio: "ignore" });
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
		child.unref();
	} catch (error) {
		fallBack(String(error));
	}
};

/**
 * Opens a URL in a browser. A failure to launch stays in the log and is never
 * thrown (the tool can return the URL even when no browser opened).
 *
 * In a stdio MCP server stdout is the JSON-RPC channel, so the log goes to stderr.
 *
 * @param url The URL to open
 * @param mode With `app`, a frameless Chromium window is preferred and, when none is
 *   found, it drops to a tab of the default browser. When omitted, the environment
 *   variable `JISCRIBE_MCP_BROWSER` decides (app by default)
 * @param browserCommand The executable to name in app mode. When omitted, the known
 *   Chromiums are looked for
 */
export function openBrowser(
	url: string,
	mode?: BrowserOpenMode,
	browserCommand?: string,
): void {
	const preference = calcBrowserOpenPreference(
		process.env.JISCRIBE_MCP_BROWSER,
	);
	const commands = calcBrowserOpenCommands(
		url,
		process.platform,
		mode ?? preference.mode,
		browserCommand ?? preference.browserCommand,
	);
	// Running out of app-mode candidates drops to a tab. That is not an error, only a
	// window that looks different, so where it dropped is left on the record
	const appCommandCount =
		commands.length -
		calcBrowserOpenCommands(url, process.platform, "tab").length;
	spawnFirstAvailable(commands, 0, (nextIndex) => {
		if (nextIndex === appCommandCount && appCommandCount > 0) {
			console.error(
				"No Chromium found for app mode; opening in the default browser instead (set JISCRIBE_MCP_BROWSER to name one).",
			);
		}
	});
}
