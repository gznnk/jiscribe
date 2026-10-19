import type { TableAxis } from "../../grid/tableTrack";

/** Letters a column's label is spelled in, as a spreadsheet does it. */
const COLUMN_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * The label a track's grip carries, as a spreadsheet heads its rows and columns:
 * rows count from `1`, columns run `A`…`Z`, then `AA`…`AZ`, `BA`… — bijective
 * base 26, so there is no zero letter and `Z` is followed by `AA`.
 *
 * @param axis - Which heading to spell: numbers for a row, letters for a column
 * @param index - The track's 0-based index; `0` is `"1"` for a row and `"A"` for a column
 */
export const formatTableTrackLabel = (
	axis: TableAxis,
	index: number,
): string => {
	if (axis === "row") {
		return String(index + 1);
	}
	let label = "";
	let remaining = index;
	do {
		label = COLUMN_LETTERS[remaining % 26] + label;
		remaining = Math.floor(remaining / 26) - 1;
	} while (remaining >= 0);
	return label;
};
