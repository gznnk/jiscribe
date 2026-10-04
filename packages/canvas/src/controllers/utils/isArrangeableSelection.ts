import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Determines whether the arrange (z-order change) command can be executed.
 *
 * Returns true when the selection is non-empty and all of it shares the same
 * parent (within the same group, or all at root). A connector is always directly
 * under root, so on its own it is always true.
 */
export function isArrangeableSelection(state: CanvasControllerState): boolean {
	const ids = state.selection.objectIds;
	if (ids.length === 0) {
		return false;
	}
	const firstParentId = state.objects[ids[0]]?.parentId;
	return ids.every((id) => state.objects[id]?.parentId === firstParentId);
}
