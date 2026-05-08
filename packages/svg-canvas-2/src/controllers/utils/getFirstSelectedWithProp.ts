import { collectDescendantIds } from "./collectDescendantIds";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * selectedIds から指定プロパティを持つ最初のオブジェクトを返す。
 * グループが含まれる場合は子孫まで再帰的に探索する。
 */
export function getFirstSelectedWithProp(
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	prop: string,
): ObjectState | undefined {
	for (const id of selectedIds) {
		const obj = objects[id];
		if (!obj) continue;
		if (prop in obj) return obj;
		for (const descId of collectDescendantIds(id, objects)) {
			const desc = objects[descId];
			if (desc && prop in desc) return desc;
		}
	}
	return undefined;
}
