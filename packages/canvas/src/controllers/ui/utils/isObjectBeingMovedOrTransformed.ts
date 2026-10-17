import type { DragKind } from "../../CanvasTypes";

/**
 * Whether the drag in progress changes the selected object's geometry — moving
 * it, or resizing or rotating it through a transform handle. The controls that
 * ride along that geometry (connection anchors, vertex handles, a type's own
 * selection controls) hide for its duration; an `"other"` drag keeps them, since the
 * thing being dragged may be one of them.
 *
 * @param activeDragKind - `activeDrag.kind`, or null when no drag is under way
 */
export const isObjectBeingMovedOrTransformed = (
	activeDragKind: DragKind | null,
): boolean => activeDragKind === "move" || activeDragKind === "transform";
