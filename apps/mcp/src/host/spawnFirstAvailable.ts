import { spawn, type ChildProcess } from "node:child_process";

import type { BrowserOpenCommand } from "./browserOpenCommands";

/**
 * How long after it started a browser's exit still counts as the launch having
 * failed. A Chromium that could not start is gone in well under a second; one that
 * is still up after this has the page open, and its exit from then on is a window
 * being closed, a kill, or a crash — none of them a reason to put another one up
 */
const LAUNCH_FAILURE_WINDOW_MS = 3_000;

/** What to do as the candidates are tried, and the one fact that changes how they are */
export type SpawnFirstAvailableOptions = {
	/** Called with the index of the candidate about to be tried instead of the last one */
	onAdvance: (nextIndex: number) => void;
	/** Called with every process actually spawned, in the order they are tried */
	onSpawn: (child: ChildProcess) => void;
	/** Called once, when the last candidate has failed. It carries that failure */
	onExhausted: (reason: string) => void;
	/**
	 * Whether the process spawned is the browser itself rather than a launcher
	 * that hands the URL on and leaves. When it is, it is kept attached (someone
	 * has to be left able to kill it) and the chain latches once it has been up
	 * long enough to count as started
	 */
	isChildTheBrowser: boolean;
	/**
	 * How long a browser has to stay up before its exit stops counting as a failed
	 * launch (milliseconds, default 3000). It is only ever passed by tests, which
	 * have no browser to wait on
	 */
	launchFailureWindowMs?: number;
};

/**
 * Tries the candidates in order. A missing executable (ENOENT) or an abnormal exit
 * drops to the next, and once they run out it reports the last failure.
 *
 * The exit code is looked at as well because a launcher can fail in the shape of
 * "it launches, but there is nothing to launch" (macOS's `open -na`, Windows's
 * `start`). A browser that did open either does not exit until the window is
 * closed, or hands over to an existing process and leaves with 0.
 *
 * @param commands The candidates, in the order they are tried. Must not be empty
 * @param index Which of them to try. Callers start at 0; the fallback recurses
 * @param options The callbacks, and whether the child is the browser itself
 */
export const spawnFirstAvailable = (
	commands: readonly BrowserOpenCommand[],
	index: number,
	options: SpawnFirstAvailableOptions,
): void => {
	const [command, ...args] = commands[index];
	// Latches this candidate: once it has advanced, or turned out to be the one,
	// nothing it reports afterwards starts another browser
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
		child.on("spawn", () => {
			if (!options.isChildTheBrowser) {
				return;
			}
			// An executable that is not there never gets here: it reports error
			// instead. So the browser is up, and once it has stayed up it is the one
			// that stuck. The timer is unref'd, so the three seconds never hold a
			// process open that is otherwise finished
			setTimeout(() => {
				isSettled = true;
			}, options.launchFailureWindowMs ?? LAUNCH_FAILURE_WINDOW_MS).unref();
		});
		child.on("exit", (code) => {
			// code is null when it died on a signal, and when it never launched at
			// all. The latter arrives separately as error, so nothing is decided here
			if (code === 0) {
				isSettled = true;
				return;
			}
			// A child this process killed is on its way out, not a launch that
			// failed. Windows has no signals, so a kill surfaces as an exit code
			if (child.killed) {
				isSettled = true;
				return;
			}
			if (code !== null) {
				fallBack(`${command} exited with ${code}`);
			}
		});
		if (!options.isChildTheBrowser) {
			// A launcher is left to outlive this process; the browser itself is not,
			// since it is this process that has to be able to close it again
			child.unref();
		}
	} catch (error) {
		fallBack(String(error));
	}
};
