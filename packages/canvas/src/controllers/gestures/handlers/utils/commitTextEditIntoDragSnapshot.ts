import type { CanvasControllerState } from "../../../CanvasTypes";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import { readOpenTextEdit } from "../../../utils/readOpenTextEdit";

/**
 * commitTextEditIfNeeded for a handler whose drag works on canvas content,
 * called from its dragStart ahead of its first frame. handleGesture froze the
 * drag's start snapshot before routing, and every frame is rebuilt from it, so
 * the committed object is written into `startSnapshot.objects` as well; left
 * out, the next frame would put the old text back.
 *
 * Only `objects` is patched: a commit writes a shape's text slot, or a
 * connector's label (its text, its placement, or the label itself), never the
 * geometry the keyPoints, bboxes and snap candidates beside it were frozen
 * from, which hold no connector anyway. An auto-height resize lands later, in
 * the reducer.
 *
 * @param state - The state at dragStart; returned as is when no edit is open.
 *   With no drag open (a handler run outside handleGesture) this is a plain
 *   commit
 */
export const commitTextEditIntoDragSnapshot = (
	state: CanvasControllerState,
): CanvasControllerState => {
	const openEdit = readOpenTextEdit(state);
	if (openEdit === null) {
		return state;
	}
	const ownerId =
		openEdit.kind === "connectorLabel"
			? openEdit.connector.id
			: openEdit.object.id;
	const committed = commitTextEditIfNeeded(state);
	const { drag } = committed;
	// Unchanged objects: the edit closed with nothing to write.
	if (drag === null || committed.objects === state.objects) {
		return committed;
	}
	return {
		...committed,
		drag: {
			...drag,
			startSnapshot: {
				...drag.startSnapshot,
				objects: {
					...drag.startSnapshot.objects,
					[ownerId]: committed.objects[ownerId],
				},
			},
		},
	};
};
