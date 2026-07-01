import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Returns only the top-level items from selectedIds, excluding descendants whose
 * ancestor is also selected.
 *
 * Example: for [GroupA, Rect1, Rect2] where Rect1 and Rect2 are children of GroupA
 *   → returns [GroupA] (Rect1 and Rect2 are excluded)
 *
 * Used to correctly apply grouping operations to a selection that mixes a group and
 * its descendants (e.g. area selection).
 */
export function getTopLevelSelectedIds(
	selectedIds: string[],
	objects: Record<string, ObjectState>,
): string[] {
	const selectedSet = new Set(selectedIds);
	return selectedIds.filter((id) => {
		let parentId = objects[id]?.parentId;
		while (parentId != null) {
			if (selectedSet.has(parentId)) {
				return false;
			}
			parentId = objects[parentId]?.parentId;
		}
		return true;
	});
}
