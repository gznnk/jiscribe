import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { collectDescendantIds } from "../../../../utils/collectDescendantIds";

/**
 * Returns the first object among `selectedIds` whose type enables the given
 * style group. When a group is included, recurses into its descendants.
 *
 * The counterpart to {@link getFirstSelectedWithProp} for the fields a type has
 * a default for: a document that omits `fill` or `strokeWidth` yields a state
 * without that key (the mapper copies only what the doc wrote), so searching by
 * property would skip exactly the objects whose type default the menu has to
 * show. The declaration is what says the object has the field at all.
 *
 * @param selectedIds - The selection, in the order the first match is taken from
 * @param objects - Every object of the canvas, keyed by id; ids not in it are skipped
 * @param feature - Which style group must be enabled: `"stroke"` for stroke color / width / dash, `"fill"` for the face
 * @returns The object, or undefined when nothing selected declares the group (a state carrying no `features` declares none)
 */
export function getFirstSelectedWithFeature(
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	feature: "stroke" | "fill",
): ObjectState | undefined {
	for (const id of selectedIds) {
		const selected = objects[id];
		if (!selected) {
			continue;
		}
		if (selected.features?.[feature]) {
			return selected;
		}
		for (const descendantId of collectDescendantIds(id, objects)) {
			const descendant = objects[descendantId];
			if (descendant?.features?.[feature]) {
				return descendant;
			}
		}
	}
	return undefined;
}
