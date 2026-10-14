import {
	calcWrappedTextBlockSize,
	DEFAULT_FONT_FAMILY,
	readTextMeasurementGeneration,
	TEXT_STYLE_FALLBACK,
} from "@jiscribe/canvas-sdk/doc";
import type { TextMeasureFont } from "@jiscribe/canvas-sdk/doc";
import { isRichText, resolveTextSlotStyle } from "@jiscribe/doc";

import { TABLE_CELL_STYLE_DEFAULTS } from "../schema/TableDoc";
import type { TableCell } from "../schema/TableDoc";

/** One cell's last measurement, with the width and the measurement generation it was taken at. */
type CellTextHeightEntry = {
	generation: number;
	wrapWidth: number;
	height: number;
};

/**
 * The height each cell's text last measured at, kept against the cell object.
 * Cells are never written in place (TableCell), so the object fixes the text and
 * the typography, and the width is the one other input. Weak, so an entry lives
 * exactly as long as the cell; one width per cell, which is all a column drag
 * needs — the cell is re-measured at each new width anyway.
 */
const cellTextHeightCache = new WeakMap<TableCell, CellTextHeightEntry>();

/** Stands in for a grid position no cell is keyed at, which measures as an empty cell. */
const EMPTY_CELL: TableCell = { text: "" };

/**
 * The font one cell's text is drawn — and so measured — with: what the cell
 * states, over the type's cell defaults, over what the overlay draws an unset
 * field with. The family is the last to be filled in because
 * TABLE_CELL_STYLE_DEFAULTS names none, and DEFAULT_FONT_FAMILY is what the
 * overlay then draws in.
 */
const resolveCellFont = (cell: TableCell): TextMeasureFont => {
	const style = resolveTextSlotStyle(TABLE_CELL_STYLE_DEFAULTS, cell);
	return {
		fontSize: style.fontSize ?? TEXT_STYLE_FALLBACK.fontSize,
		fontFamily: style.fontFamily ?? DEFAULT_FONT_FAMILY,
		fontWeight: style.fontWeight ?? TEXT_STYLE_FALLBACK.fontWeight,
		fontStyle: style.fontStyle,
	};
};

/**
 * Height one cell's text asks for: the box the shared measurement gives that text
 * at that width, its padding included. An empty cell still asks for one line,
 * which is what gives a row of empty cells its height.
 *
 * Measured once per cell object and width, so a pass that re-lays a grid out
 * measures only the cells whose object or column width changed: a row's height
 * being dragged measures none, a column boundary the two columns beside it.
 *
 * @param cell - The cell, or undefined for a grid position no cell is keyed at
 * @param wrapWidth - Width of the box the text wraps inside, the rules' share already taken off; the text padding is subtracted by the measurement itself
 * @returns The height in local px, the same number calcWrappedTextBlockSize gives; an entry taken under an earlier measurement generation (web fonts arriving since) is measured again
 */
export const readCachedCellTextHeight = (
	cell: TableCell | undefined,
	wrapWidth: number,
): number => {
	const key = cell ?? EMPTY_CELL;
	const generation = readTextMeasurementGeneration();
	const cached = cellTextHeightCache.get(key);
	if (
		cached !== undefined &&
		cached.generation === generation &&
		cached.wrapWidth === wrapWidth
	) {
		return cached.height;
	}
	const { height } = calcWrappedTextBlockSize(
		isRichText(key.text) ? key.text : "",
		resolveCellFont(key),
		wrapWidth,
	);
	cellTextHeightCache.set(key, { generation, wrapWidth, height });
	return height;
};
