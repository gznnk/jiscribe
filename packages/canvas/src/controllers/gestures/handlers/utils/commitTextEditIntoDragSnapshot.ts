import type { CanvasControllerState } from "../../../CanvasTypes";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import { readOpenTextEdit } from "../../../utils/readOpenTextEdit";

/**
 * commitTextEditIfNeeded for the handlers whose gestures can change canvas
 * content, which is what keeps a drag on content from running beside an open
 * text edit (see CanvasDrag). Which handlers commit an open edit, and at which event — the one
 * list of them:
 * - ObjectEventHandler, ConnectorEventHandler and ControlEventHandler: here, on
 *   every event before they handle or route it, a touch press excepted
 *   (commitTextEditUnlessTouchPress)
 * - CanvasEventHandler: here, on every mouse or pen event but zoom and scroll,
 *   before it handles it; on touch only at a click or longPress, through
 *   commitTextEditIfNeeded, so a one-finger pan of the background leaves the
 *   edit open
 * - StencilLibraryItemHandler: here, in its own dragStart, and through
 *   commitTextEditIfNeeded in its click; its press leaves the edit open whatever
 *   the pointer. MenuEventHandler, the router above it, commits nothing, since a
 *   menu drag leaves the edit open
 *
 * At a dragStart the commit lands ahead of the drag's first frame: handleGesture
 * froze the drag's start snapshot before routing, and every frame is rebuilt
 * from it, so the committed object is written into `startSnapshot.objects` as
 * well; left out, the next frame would put the old text back.
 *
 * Only `objects` is patched: a commit writes a shape's text slot, or a
 * connector's label (its text, its placement, or the label itself), never the
 * geometry the keyPoints, bboxes and snap candidates beside it were frozen
 * from, which hold no connector anyway. An auto-height resize lands later, in
 * the reducer.
 *
 * @param state - The state the event arrived on; returned as is when no edit
 *   is open. With no drag open (a press, click or doubleClick, or a handler run
 *   outside handleGesture) this is a plain commit
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
