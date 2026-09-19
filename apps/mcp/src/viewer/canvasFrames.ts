/**
 * The longest {@link waitForCanvasFrames} waits. A window in the background is given
 * no frames at all, and the host gives up on the whole flush after 3 seconds
 */
const CANVAS_FRAMES_TIMEOUT_MS = 200;

/**
 * Waits two frames, for the canvas to take up pointer input it has queued for an
 * animation frame (a drag released just before). The render and the effect that
 * hand the resulting commit over are not covered; useCanvasCommitWait waits for
 * those after this.
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
