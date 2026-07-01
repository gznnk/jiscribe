import { collectDescendantIds } from "./collectDescendantIds";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Builds a Set containing the selected IDs plus all of their descendant IDs.
 *
 * Computed once at dragStart and cached in eventStartState to avoid recomputing
 * it on every frame during the drag.
 *
 * @param selectedIds - List of currently selected object IDs
 * @param objects - Flat object map
 * @returns A ReadonlySet containing selectedIds and all descendant IDs
 */
export function buildSelectedIdsWithDescendants(
	selectedIds: readonly string[],
	objects: Record<string, ObjectState>,
): ReadonlySet<string> {
	const result = new Set<string>(selectedIds);
	for (const id of selectedIds) {
		for (const descendantId of collectDescendantIds(id, objects)) {
			result.add(descendantId);
		}
	}
	return result;
}
