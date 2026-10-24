import type {
	CanvasControllerState,
	CanvasDragDetail,
	DragStartSnapshot,
} from "../CanvasTypes";

/**
 * Names what the open drag is doing, dropping whatever its previous kind held.
 * handleGesture opens every drag as `"inert"`; the handler it reaches calls this
 * in its own dragStart.
 *
 * @param state - The state at dragStart; returned as is when no drag is open,
 *   which only happens to a handler run outside handleGesture — the handler unit
 *   tests that call one directly with `drag: null` rely on it
 * @param detail - The kind, with everything only that kind holds
 * @param options - `edgeScroll`: whether dragging near a canvas edge scrolls
 *   the view for the rest of this drag. `startSnapshot`: replaces the frozen
 *   snapshot, for a handler that settles something the snapshot holds (the
 *   selection a move drags) before its first frame; omitted, it is kept
 * @returns A new state whose drag keeps its snapshot and feedback and takes the
 *   new kind
 */
export const claimDrag = (
	state: CanvasControllerState,
	detail: CanvasDragDetail,
	options: { edgeScroll: boolean; startSnapshot?: DragStartSnapshot },
): CanvasControllerState => {
	const { drag } = state;
	if (drag === null) {
		return state;
	}
	return {
		...state,
		drag: {
			...detail,
			startSnapshot: options.startSnapshot ?? drag.startSnapshot,
			snapFeedback: drag.snapFeedback,
			axisLockFeedback: drag.axisLockFeedback,
			edgeScrollEnabled: options.edgeScroll,
		},
	};
};
