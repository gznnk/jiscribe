/**
 * The longest {@link waitForCanvasFrames} waits. A window in the background is given
 * no frames at all, and the host gives up on the whole flush after 3 seconds
 */
const CANVAS_FRAMES_TIMEOUT_MS = 200;

/**
 * Waits two frames, for an edit the canvas is still holding to reach onCommit: it
 * takes pointer input up on an animation frame and hands the commit over in an
 * effect after drawing it, so a drag released just before would otherwise be
 * committed after whatever the caller does next. Best effort — a render slower than
 * a frame can still miss it.
 *
 * @returns A promise settled after two animation frames, or after
 *   {@link CANVAS_FRAMES_TIMEOUT_MS} when the window is given none
 */
export const waitForCanvasFrames = (): Promise<void> =>
	new Promise((resolve) => {
		const timer = window.setTimeout(resolve, CANVAS_FRAMES_TIMEOUT_MS);
		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => {
				window.clearTimeout(timer);
				resolve();
			});
		});
	});
