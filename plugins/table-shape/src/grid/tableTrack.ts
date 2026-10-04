import type { TableState } from "../state/TableState";

/**
 * One of the table's two directions, spelled as the part kind that selects a
 * whole track of it: `"row"` is a horizontal band of cells, `"column"` a vertical
 * one. The same word names the axis an insertion or a removal runs along, so a
 * function taking it needs only the one parameter.
 *
 * Distinct from `"textSlot"` on purpose. A cell range and a row are different
 * selections with different meanings for Delete — clear the named cells versus
 * remove the row — which is the whole reason a grip writes this kind rather than
 * the cells of the track it stands for.
 */
export type TableAxis = "row" | "column";

/** Part kind of a whole row, and the `kind` a row grip's click writes. */
export const TABLE_ROW_PART_KIND = "row" satisfies TableAxis;

/** Part kind of a whole column, and the `kind` a column grip's click writes. */
export const TABLE_COLUMN_PART_KIND = "column" satisfies TableAxis;

/**
 * The part id one track is named by: its index, written plainly. The index is
 * positional, so nothing about it survives an insertion ahead of it — every live
 * selection is moved with the grid (remapTablePartSelectionForInsert).
 *
 * @param index - 0-based from the table's top edge for a row, from its left edge for a column
 * @returns The part id, e.g. `"2"` for the third track
 */
export const tableTrackPartId = (index: number): string => String(index);

/**
 * The track index one part id names — the inverse of {@link tableTrackPartId},
 * also used on the `data-part` segment a grip carries, the two being the same
 * text.
 *
 * Non-negative integers written plainly are the whole of the contract: `"1.5"`,
 * `"1e1"`, `"-1"` and `" 1"` are refused rather than coerced into an index the
 * grid never offered.
 *
 * @param partId - The id to read, or undefined for a grip whose part carries no index segment
 * @returns The 0-based index, or null when the text is not one; whether the grid has that track is the caller's to check
 */
export const parseTableTrackPartId = (
	partId: string | undefined,
): number | null =>
	partId !== undefined && /^\d+$/.test(partId) ? Number(partId) : null;

/**
 * How many tracks the table has along one axis.
 *
 * @param state - The table to count; its `rows` / `columns` are the grid's shape
 * @param axis - Which of the two to count
 * @returns The count, at least 1 for a table that passed validation
 */
export const countTableTracks = (state: TableState, axis: TableAxis): number =>
	axis === "row" ? state.rows.length : state.columns.length;
