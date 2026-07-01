import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { collectDescendantIds } from "../../../../utils/collectDescendantIds";

/**
 * Returns the first object among `selectedIds` that has the given property.
 * When a group is included, recurses into its descendants.
 */
export function getFirstSelectedWithProp(
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	prop: string,
): ObjectState | undefined {
	for (const id of selectedIds) {
		const obj = objects[id];
		if (!obj) {
			continue;
		}
		if (prop in obj) {
			return obj;
		}
		for (const descId of collectDescendantIds(id, objects)) {
			const desc = objects[descId];
			if (desc && prop in desc) {
				return desc;
			}
		}
	}
	return undefined;
}
