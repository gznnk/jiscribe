import type { CanvasDrag, DragKind } from "../../CanvasTypes";

/**
 * A drag that changes the selected objects' geometry: a move, or a resize or
 * rotation through a transform handle. The controls riding along that geometry
 * hide for its duration; a drag of one of those controls is of another kind.
 */
export type SelectionDragKind = Extract<DragKind, "move" | "transform">;

/**
 * Reads which drag the selected objects are going through, narrowed so the value
 * holds still through a pan, a menu drag or any other drag, and the control
 * layers' memos with it.
 *
 * @param drag - `state.drag`; null when no drag is under way
 * @returns `drag.kind` when it is `"move"` or `"transform"`, otherwise null
 */
export const readSelectionDragKind = (
	drag: Pick<CanvasDrag, "kind"> | null,
): SelectionDragKind | null =>
	drag?.kind === "move" || drag?.kind === "transform" ? drag.kind : null;
