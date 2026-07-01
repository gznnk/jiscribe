import type { CanvasControllerState } from "../CanvasTypes";
import { getEffectiveSelectedIds } from "./getEffectiveSelectedIds";

/**
 * Determines whether the arrange (z-order change) command can be executed.
 *
 * Because it targets connector selection (selectedConnectorId) in addition to object
 * selection (selectedIds), the check uses the effective selection via getEffectiveSelectedIds.
 * Returns true when the effective selection is non-empty and all elements share the same
 * parent (within the same group, or all at root). A connector is always directly under root,
 * so on its own it is always true.
 */
export function isArrangeableSelection(state: CanvasControllerState): boolean {
	const ids = getEffectiveSelectedIds(state);
	if (ids.length === 0) {
		return false;
	}
	const firstParentId = state.objects[ids[0]]?.parentId;
	return ids.every((id) => state.objects[id]?.parentId === firstParentId);
}
