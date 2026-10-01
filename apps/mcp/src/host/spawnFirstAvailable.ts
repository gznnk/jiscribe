import { spawn, type ChildProcess } from "node:child_process";

import type { BrowserOpenCommand } from "./browserOpenCommands";

/**
 * How long after it started a browser's exit still counts as the launch having
 * failed. A Chromium that could not start is gone in well under a second; one that
 * is still up after this has the page open, and its exit from then on is a window
 * being closed, a kill, or a crash — none of them a reason to put another one up
 */
const LAUNCH_FAILURE_WINDOW_MS = 3_000;

/**
 * How much of a browser's stderr is kept, from the start, to say why it died.
 * Chromium puts the one line that explains itself first and a stack trace after
 * it, so the head is what carries the reason; everything past this is dropped
 */
const STDERR_CAPTURE_BYTES = 16_384;

/**
 * How long after a browser's exit its stderr is still waited for. The exit comes
 * from the process and the output from a pipe, so the last of the output can
 * still be on its way when the exit lands. The pipe's own end would be the exact
 * moment, but a helper process the browser left behind keeps the pipe open past
 * it, so this is the ceiling
 */
const STDERR_GRACE_MS = 200;

/** What to do as the candidates are tried, and the one fact that changes how they are */
export type SpawnFirstAvailableOptions = {
	/** Called with the index of the candidate about to be tried instead of the last one */
	onAdvance: (nextIndex: number) => void;
	/** Called with every process actually spawned, in the order they are tried */
	onSpawn: (child: ChildProcess) => void;
	/**
	 * Called once, when the last candidate has failed. It carries that failure,
	 * and what that candidate wrote to stderr before it died — the head of it, up
	 * to STDERR_CAPTURE_BYTES — or "" when nothing was written or the child was
	 * not the browser (a launcher's stderr is not read; see isChildTheBrowser)
	 */
	onExhausted: (reason: string, stderr: string) => void;
	/**
	 * Whether the process spawned is the browser itself rather than a launcher
	 * that hands the URL on and leaves. When it is, it is kept attached (someone
	 * has to be left able to kill it), its stderr is read so that a launch that
	 * failed can be explained, and the chain latches once it has been up long
	 * enough to count as started
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
 * Reads a child's stderr as it comes, keeping the head of it. Reading it is not
 * optional once the pipe is open: a child that fills an unread pipe blocks on
 * its next write.
 *
 * @param child A child spawned with its stderr piped
 * @returns What has been read so far, cut at the capture limit
 */
const captureStderrHead = (child: ChildProcess): (() => string) => {
	let text = "";
	child.stderr?.setEncoding("utf8");
	child.stderr?.on("data", (chunk: string) => {
		if (text.length < STDERR_CAPTURE_BYTES) {
			text = (text + chunk).slice(0, STDERR_CAPTURE_BYTES);
		}
	});
	return () => text;
};

/**
 * Tries the candidates in order. A missing executable (ENOENT) or an abnormal exit
 * drops to the next, and once they run out it reports the last failure.
 *
 * The exit is looked at as well because a launcher can fail in the shape of "it
 * launches, but there is nothing to launch" (macOS's `open -na`, Windows's
 * `start`), and a browser in the shape of starting and then killing itself (a
 * Chromium whose sandbox cannot be set up dies on a signal). A browser that did
 * open either does not exit until the window is closed, or hands over to an
 * existing process and leaves with 0.
 *
 * @param commands The candidates, in the order they are tried. Must not be empty:
 *   there is nothing to report the failure of otherwise
 * @param options The callbacks, and whether the child is the browser itself
 */
export const spawnFirstAvailable = (
	commands: readonly BrowserOpenCommand[],
	options: SpawnFirstAvailableOptions,
): void => {
	/**
	 * Tries one candidate, and hands over to the one after it on failure.
	 *
	 * @param index Which candidate to try, counting from the head of the list
	 */
	const spawnFrom = (index: number): void => {
		const [command, ...args] = commands[index];
		// Latches this candidate: once it has advanced, or turned out to be the one,
		// nothing it reports afterwards starts another browser
		let isSettled = false;
		const advanceOrExhaust = (reason: string, stderr: string): void => {
			if (index + 1 < commands.length) {
				options.onAdvance(index + 1);
				spawnFrom(index + 1);
				return;
			}
			options.onExhausted(reason, stderr);
		};
		const fallBack = (reason: string): void => {
			if (isSettled) {
				return;
			}
			isSettled = true;
			advanceOrExhaust(reason, "");
		};
		try {
			const child = spawn(command, args, {
				stdio: [
					"ignore",
					"ignore",
					options.isChildTheBrowser ? "pipe" : "ignore",
				],
			});
			options.onSpawn(child);
			const readStderr = options.isChildTheBrowser
				? captureStderrHead(child)
				: null;
			/**
			 * Falls back once the browser's stderr has been read to the end, or has
			 * had its grace: the reason is worth little without what it wrote
			 */
			const fallBackWithStderr = (reason: string): void => {
				if (isSettled) {
					return;
				}
				if (readStderr === null) {
					fallBack(reason);
					return;
				}
				isSettled = true;
				let isReported = false;
				const report = (): void => {
					if (isReported) {
						return;
					}
					isReported = true;
					advanceOrExhaust(reason, readStderr());
				};
				// close follows exit once every stdio stream has ended
				child.once("close", report);
				setTimeout(report, STDERR_GRACE_MS).unref();
			};
			child.on("error", (error) => {
				fallBackWithStderr(String(error));
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
			child.on("exit", (code, signal) => {
				// A child that never launched reports error, not exit, so an exit
				// without a code is a death on a signal
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
				fallBackWithStderr(
					code !== null
						? `${command} exited with ${code}`
						: `${command} died on ${signal ?? "a signal"}`,
				);
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
	spawnFrom(0);
};
