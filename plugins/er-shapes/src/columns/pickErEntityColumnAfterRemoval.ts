import type { ObjectPartSelection } from "@jiscribe/canvas";

import { ER_ENTITY_COLUMN_PART_KIND } from "../parts/erEntityColumnPartKind";
import { erEntityColumnPartId } from "../schema/erEntityColumnIds";

/**
 * What is picked once columns have been removed: the first column left behind
 * the first removed one in declared order, which after the renumbering sits at
 * that one's index — with a run removed, the column that followed the run; the
 * last remaining column when nothing was left behind; nothing — the entity as a
 * whole — when no column is left.
 *
 * @param removedIndices - The removed columns' 0-based indices from before the removal, in any order; empty is read as nothing having moved and picks the first column
 * @param remainingColumnCount - How many columns the entity holds after the removal
 * @returns A one-column pick of {@link ER_ENTITY_COLUMN_PART_KIND}, or null when the entity has no column left
 */
export const pickErEntityColumnAfterRemoval = (
	removedIndices: readonly number[],
	remainingColumnCount: number,
): ObjectPartSelection | null => {
	if (remainingColumnCount <= 0) {
		return null;
	}
	const firstRemoved =
		removedIndices.length === 0 ? 0 : Math.min(...removedIndices);
	const partId = erEntityColumnPartId(
		Math.min(Math.max(firstRemoved, 0), remainingColumnCount - 1),
	);
	return {
		kind: ER_ENTITY_COLUMN_PART_KIND,
		ranges: [{ anchorId: partId, focusId: partId }],
	};
};
