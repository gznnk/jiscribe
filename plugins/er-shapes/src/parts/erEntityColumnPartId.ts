/**
 * Part kind of one whole column — the three slots of one row taken as one thing,
 * which is what a column grip's click writes (ErEntityColumnGripControl) and what
 * Delete removes. Distinct from `"textSlot"` on purpose: Delete over a picked slot
 * empties its text, over a picked column it removes the column.
 */
export const ER_ENTITY_COLUMN_PART_KIND = "erEntityColumn";

/** The grammar {@link erEntityColumnPartId} writes, and the only spelling read back. */
const ER_ENTITY_COLUMN_PART_ID_PATTERN = /^col:(\d+)$/;

/**
 * The part id one column is named by: the prefix its slot ids and connect point
 * ids share (erEntityColumnTextSlotId). Positional like them, so an insertion or
 * a removal ahead of a column renames it.
 *
 * @param columnIndex - Index into the doc's `columns`, 0-based, in declared order
 * @returns The part id, e.g. `col:2`
 */
export const erEntityColumnPartId = (columnIndex: number): string =>
	`col:${columnIndex}`;

/**
 * The column index one part id names — the inverse of {@link erEntityColumnPartId}.
 *
 * @param partId - The id to read, or undefined for a grip whose action carries no index segment; a slot id such as `col:2:name` is refused rather than read as its column
 * @returns The 0-based index, or null when the text is not a column part id; whether the entity has that column is the caller's to check
 */
export const parseErEntityColumnPartId = (
	partId: string | undefined,
): number | null => {
	if (partId === undefined) {
		return null;
	}
	const matched = ER_ENTITY_COLUMN_PART_ID_PATTERN.exec(partId);
	return matched === null ? null : Number(matched[1]);
};
