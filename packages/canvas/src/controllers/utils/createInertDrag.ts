import type { CanvasDrag, DragStartSnapshot } from "../CanvasTypes";

/**
 * The drag every drag starts as (handleGesture's dragStart) and a cancelled one
 * drops back to (CANCEL_DRAG): no handler's kind, no feedback, no edge scroll.
 * It keeps "a drag is under way" true until release; the handler the drag
 * reaches names it through claimDrag.
 *
 * @param startSnapshot - Kept by reference: the snapshot frozen at dragStart,
 *   which a cancelled drag carries over rather than retaking mid-drag
 * @returns A drag of kind `"inert"`
 */
export const createInertDrag = (
	startSnapshot: DragStartSnapshot,
): CanvasDrag => ({
	kind: "inert",
	startSnapshot,
	snapFeedback: null,
	axisLockFeedback: null,
	edgeScrollEnabled: false,
});
