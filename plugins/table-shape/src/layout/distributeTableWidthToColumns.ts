import { PRECISION } from "@jiscribe/canvas-sdk";
import { roundToDecimal } from "@jiscribe/geometry";

import { TABLE_MIN_COLUMN_WIDTH } from "../schema/TableDoc";
import type { TableColumnDoc } from "../schema/TableDoc";

/**
 * One column's share of the width left to hand out. Columns of zero width — which
 * only a grid summing to zero can have — split it evenly instead, there being no
 * proportion to keep.
 */
const calcColumnShare = (
	startWidth: number,
	freeWidth: number,
	freeTotal: number,
	freeCount: number,
): number =>
	freeTotal > 0 ? (startWidth / freeTotal) * freeWidth : freeWidth / freeCount;

/**
 * What is left for the columns that are not pinned: the width the pinned ones do
 * not already claim, how much of the starting grid the rest hold between them, and
 * how many they are. The one statement of that budget, because the pass that
 * decides the pinning and the pass that hands out the widths have to read the same
 * one — a share computed against a different budget would pin a column and then
 * give it something else.
 *
 * @param startColumns - The columns as of the write, left to right
 * @param width - Total to hand out, at or above the grid's minimum
 * @param pinned - One flag per column, true where it is held at the minimum
 * @returns The three figures {@link calcColumnShare} divides between the unpinned columns
 */
const calcFreeBudget = (
	startColumns: readonly TableColumnDoc[],
	width: number,
	pinned: readonly boolean[],
): { freeWidth: number; freeTotal: number; freeCount: number } => {
	const freeCount = pinned.filter((isPinned) => !isPinned).length;
	return {
		freeCount,
		freeTotal: startColumns.reduce(
			(total, column, index) => (pinned[index] ? total : total + column.width),
			0,
		),
		freeWidth:
			width - (startColumns.length - freeCount) * TABLE_MIN_COLUMN_WIDTH,
	};
};

/**
 * Which columns end up at {@link TABLE_MIN_COLUMN_WIDTH} rather than at their
 * share. Pinning one lowers every other column's share — it gives up less width
 * than its proportion asked of it — so a pass can uncover more, and the passes
 * repeat until none does. At most one pass per column.
 *
 * @param startColumns - The columns as of the write, left to right
 * @param width - Total to hand out, already at or above the grid's minimum
 * @returns One flag per column, by index, true where the column is pinned
 */
const findPinnedColumns = (
	startColumns: readonly TableColumnDoc[],
	width: number,
): boolean[] => {
	const pinned = startColumns.map(() => false);
	let budget = calcFreeBudget(startColumns, width, pinned);

	let pinnedMore = true;
	while (pinnedMore) {
		pinnedMore = false;
		startColumns.forEach((column, index) => {
			if (
				pinned[index] ||
				calcColumnShare(
					column.width,
					budget.freeWidth,
					budget.freeTotal,
					budget.freeCount,
				) >= TABLE_MIN_COLUMN_WIDTH
			) {
				return;
			}
			pinned[index] = true;
			pinnedMore = true;
		});
		if (pinnedMore) {
			budget = calcFreeBudget(startColumns, width, pinned);
		}
	}
	return pinned;
};

/**
 * Which column carries the rounding residue: the widest of the ones not pinned at
 * the minimum, so the nudge can never push a column under it. -1 when every column
 * is pinned, which happens only at exactly the grid's minimum width — where the
 * residue is 0 anyway, every share being the minimum itself.
 */
const findResidueColumn = (widths: number[], pinned: boolean[]): number =>
	widths.reduce(
		(widest, width, index) =>
			pinned[index] || (widest !== -1 && widths[widest] >= width)
				? widest
				: index,
		-1,
	);

/**
 * The column widths a table of `tableWidth` is made of, each column keeping the
 * share of the total it holds now. What turns an outer-frame resize into the only
 * thing a table document stores about its size (see resizeTableStateToContent,
 * the sole caller): the transform frame writes a width, and this is what the grid
 * becomes so as to report that width back.
 *
 * Two things bound the proportions:
 *
 * - **No column goes under {@link TABLE_MIN_COLUMN_WIDTH}.** One whose share would
 *   is held there and what that costs comes off the rest, in their own proportions.
 * - **A width below `columns.length * TABLE_MIN_COLUMN_WIDTH` cannot be met**, every
 *   column already being at the minimum. The grid is built at that floor instead and
 *   the table stops there rather than narrowing past it.
 *
 * Widths are rounded to `PRECISION.SIZE`, as a document stores them, and the residue
 * the rounding leaves is given to one column so the grid sums to what was asked to
 * within that precision. Left spread, each frame of a drag would read the sum as one
 * more outside write and the table would creep.
 *
 * @param startColumns - The columns as of the write, left to right; read only, and the returned array is a fresh one whose entries are fresh too
 * @param tableWidth - Width the grid is to report, in the table's local px; below the grid's minimum it is raised to it, and a value at or under 0 yields a grid of minimums
 * @returns Fresh columns summing to `tableWidth`, or null when no column's width would change — including a grid of no columns, which has nothing to distribute into
 */
export const distributeTableWidthToColumns = (
	startColumns: readonly TableColumnDoc[],
	tableWidth: number,
): TableColumnDoc[] | null => {
	if (startColumns.length === 0) {
		return null;
	}
	const width = Math.max(
		tableWidth,
		startColumns.length * TABLE_MIN_COLUMN_WIDTH,
	);

	const pinned = findPinnedColumns(startColumns, width);
	const { freeWidth, freeTotal, freeCount } = calcFreeBudget(
		startColumns,
		width,
		pinned,
	);

	const widths = startColumns.map((column, index) =>
		roundToDecimal(
			pinned[index]
				? TABLE_MIN_COLUMN_WIDTH
				: calcColumnShare(column.width, freeWidth, freeTotal, freeCount),
			PRECISION.SIZE,
		),
	);
	const residueColumn = findResidueColumn(widths, pinned);
	if (residueColumn !== -1) {
		const rounded = widths.reduce(
			(total, columnWidth) => total + columnWidth,
			0,
		);
		widths[residueColumn] = roundToDecimal(
			widths[residueColumn] + (width - rounded),
			PRECISION.SIZE,
		);
	}

	if (
		widths.every(
			(columnWidth, index) => columnWidth === startColumns[index].width,
		)
	) {
		return null;
	}
	return startColumns.map((column, index) => ({
		...column,
		width: widths[index],
	}));
};
