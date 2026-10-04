import type { ObjectPartSelection } from "./ObjectPartSelection";

/**
 * Every part id the selection covers, ranges in their stored order, duplicates
 * kept out. The one place the ends a gesture stored
 * ({@link ObjectPartSelection}) are turned back into the set a write or a read
 * acts on.
 *
 * A range whose ends differ collapses to its focus: what lies between two parts
 * is the kind's own question, and none is asked here.
 *
 * @param part - The parts picked one level below the object
 *   (`CanvasSelection.part`), taken as it stands (the reducer has already
 *   dropped one naming something gone, reconcileSelection)
 * @returns The covered ids, non-empty whenever `part.ranges` is
 */
export const collectSelectedPartIds = (
	part: ObjectPartSelection,
): readonly string[] => {
	const collected: string[] = [];
	const seen = new Set<string>();
	for (const range of part.ranges) {
		if (!seen.has(range.focusId)) {
			seen.add(range.focusId);
			collected.push(range.focusId);
		}
	}
	return collected;
};
