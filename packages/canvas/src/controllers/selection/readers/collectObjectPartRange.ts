/**
 * The run of parts between two ids, in the order the type lists its parts
 * (ObjectPartKindDefinition.list) — the default for a kind declaring no `range` of
 * its own, which is every kind whose parts lie in one line. Which of the two
 * comes first in that order does not matter: the run is read from the lower index
 * to the higher, so an extension that reaches backwards yields the same list
 * order as one reaching forwards.
 *
 * @param orderedPartIds - Every part the object currently holds, in the type's
 *   own order; ids outside it make the range undecidable
 * @param anchorPartId - Where the range starts, the part a plain click last left
 *   selected
 * @param focusPartId - Where the range ends, the part just clicked
 * @returns The inclusive run, or `[focusPartId]` alone when either end is not in
 *   the list — a stale anchor collapses the selection rather than widening it to
 *   something arbitrary
 */
export const collectObjectPartRange = (
	orderedPartIds: readonly string[],
	anchorPartId: string,
	focusPartId: string,
): string[] => {
	const anchorIndex = orderedPartIds.indexOf(anchorPartId);
	const focusIndex = orderedPartIds.indexOf(focusPartId);
	if (anchorIndex === -1 || focusIndex === -1) {
		return [focusPartId];
	}
	const from = Math.min(anchorIndex, focusIndex);
	const to = Math.max(anchorIndex, focusIndex);
	return orderedPartIds.slice(from, to + 1);
};
