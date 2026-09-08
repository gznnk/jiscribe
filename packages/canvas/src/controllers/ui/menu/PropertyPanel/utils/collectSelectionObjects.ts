import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { collectDescendantIds } from "../../../../utils/collectDescendantIds";

/**
 * Every object the selection reaches, in selection order: the selected objects
 * themselves, each followed by its descendants when it is a group
 * (`collectDescendantIds`).
 *
 * The same walk the ObjectMenu's readers take (getFirstSelectedWithProp,
 * getFirstSelectedWithStyleGroup), gathered rather than stopped at the first
 * match — telling one value from several is exactly the part a first-match
 * reader cannot answer.
 *
 * @param selectedIds - The selection, in the order the row states its values in; an id absent from `objects` is skipped
 * @param objects - Every object of the canvas, keyed by id
 * @returns The objects, with a group listed before the descendants it contributes; no id appears twice, the map being a tree
 */
export const collectSelectionObjects = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
): ObjectState[] => {
	const collected: ObjectState[] = [];
	for (const id of selectedIds) {
		const selected = objects[id];
		if (!selected) {
			continue;
		}
		collected.push(selected);
		for (const descendantId of collectDescendantIds(id, objects)) {
			const descendant = objects[descendantId];
			if (descendant) {
				collected.push(descendant);
			}
		}
	}
	return collected;
};
