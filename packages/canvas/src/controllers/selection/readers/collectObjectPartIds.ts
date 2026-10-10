import { collectPartIdsBetween } from "./collectPartIdsBetween";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ObjectPartSelection } from "../CanvasSelection";
import type { ObjectPartKindDefinition } from "../partKinds/ObjectPartKindRegistry";

/**
 * Every part id the selection covers, in the type's own order, ranges in order,
 * duplicates kept out.
 *
 * The one place the ends a gesture stored ({@link ObjectPartSelection}) are
 * turned back into the set a write or a read acts on, so a kind whose parts do
 * not lie in one line (a table's cells) is asked how its own range runs
 * (`range`) and every other kind takes the linear default over `list`.
 *
 * @param selection - The parts picked below the object; its `kind` must be the
 *   one `part` answers for, and its ends are taken as they stand (the reducer
 *   has already dropped a selection naming something gone,
 *   reconcileSelection)
 * @param part - The definition registered for `(object.type, selection.kind)`
 * @param object - The object the ids are resolved against: the owner of the
 *   pick, `CanvasSelection.objectIds[0]`
 * @returns The covered ids, non-empty whenever `selection.ranges` is — a range
 *   whose anchor the type cannot place collapses to its focus rather than
 *   yielding nothing
 */
export const collectObjectPartIds = (
	selection: ObjectPartSelection,
	part: ObjectPartKindDefinition,
	object: ObjectState,
): readonly string[] => {
	const collected: string[] = [];
	const seen = new Set<string>();
	for (const range of selection.ranges) {
		const covered =
			range.anchorId === range.focusId
				? [range.anchorId]
				: (part.range?.(object, range.anchorId, range.focusId) ??
					collectPartIdsBetween(
						part.list?.(object) ?? [],
						range.anchorId,
						range.focusId,
					));
		for (const partId of covered) {
			if (!seen.has(partId)) {
				seen.add(partId);
				collected.push(partId);
			}
		}
	}
	return collected;
};
