import type { CanvasControllerState, CanvasDrag } from "../CanvasTypes";

/**
 * Writes the guides a drag frame draws: snap lines, the axis-lock line, or both.
 *
 * @param state - The state the frame was computed on; returned as is when no
 *   drag is open, which only happens to a handler run outside handleGesture —
 *   the handler unit tests that call one with `drag: null` rely on it
 * @param feedback - The guides to set; a key left out keeps what the previous
 *   frame drew, and null clears it
 */
export const writeDragFeedback = (
	state: CanvasControllerState,
	feedback: Partial<Pick<CanvasDrag, "snapFeedback" | "axisLockFeedback">>,
): CanvasControllerState =>
	state.drag === null
		? state
		: { ...state, drag: { ...state.drag, ...feedback } };
