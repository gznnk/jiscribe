import {
	DEFAULT_FONT_FAMILY,
	layoutVisualLines,
	readTextMeasurementGeneration,
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
	TEXT_STYLE_FALLBACK,
} from "@jiscribe/canvas-sdk/doc";
import type { TextMeasureFont, VisualLine } from "@jiscribe/canvas-sdk/doc";
import { isRichText, resolveTextSlotStyle } from "@jiscribe/doc";

import { TABLE_CELL_STYLE_DEFAULTS } from "../schema/TableDoc";
import type { TableCell } from "../schema/TableDoc";

/**
 * One cell's measurements under one measurement generation. Widths here are
 * content widths (the box minus its horizontal padding, floored at 1), the width
 * layoutVisualLines wraps at.
 */
type CellTextHeightEntry = {
	generation: number;
	/** Content width of the last measurement taken at a width the fit did not cover. */
	contentWidth: number;
	/** Box height that measurement gave. */
	height: number;
	/**
	 * Smallest content width proven to lay the text out as authored, with no soft
	 * break; Infinity until one is. A layout without a break makes the same fit
	 * tests whatever the width, so every width at or above this one lays out the
	 * same lines.
	 */
	fitContentWidth: number;
	/** Box height of the text laid out as authored; meaningful once fitContentWidth is finite. */
	fitHeight: number;
	/**
	 * Widest authored line from a layout with no break, while it is below
	 * fitContentWidth and still to be tried as the fit; undefined otherwise.
	 */
	widestLineWidth: number | undefined;
	/**
	 * Whether a layout at the widest line did break, which only a measurement
	 * whose prefixes can outmeasure the whole line produces; the widest line is
	 * then never tried again.
	 */
	isWidestLineFitRuledOut: boolean;
};

/**
 * Each cell's measurements, kept against the cell object. Cells are never
 * written in place (TableCell), so the object fixes the text and the typography,
 * and the width is the one other input. Weak, so an entry lives exactly as long
 * as the cell.
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

/** Box height of laid-out lines, summed as calcWrappedTextBlockSize sums them. */
const sumBoxHeight = (lines: VisualLine[]): number =>
	lines.reduce((total, line) => total + line.height, 0) +
	TEXT_BOX_PADDING_Y * 2;

/**
 * Whether every line ends at an authored newline or at the text's end: a line
 * after a soft break starts where the one before ends, one after a newline past it.
 */
const isLaidOutAsAuthored = (lines: VisualLine[]): boolean =>
	lines.every(
		(line, index) => index === 0 || line.start > lines[index - 1].end,
	);

/**
 * Height one cell's text asks for: the box the shared measurement gives that text
 * at that width, its padding included. An empty cell still asks for one line,
 * which is what gives a row of empty cells its height.
 *
 * Measured once per cell object and width, so a pass that re-lays a grid out
 * measures only the cells whose object or column width changed: a row's height
 * being dragged measures none, a column boundary the two columns beside it. A
 * cell is not measured again at any width its text is known to fit unbroken, so
 * an outer resize measures only the cells whose text wraps.
 *
 * @param cell - The cell, or undefined for a grid position no cell is keyed at
 * @param wrapWidth - Width of the box the text wraps inside, the rules' share already taken off; the text padding is subtracted here, as calcWrappedTextBlockSize subtracts it
 * @returns The height in local px, the same number calcWrappedTextBlockSize gives; an entry taken under an earlier measurement generation (web fonts arriving since) is measured again
 */
export const readCachedCellTextHeight = (
	cell: TableCell | undefined,
	wrapWidth: number,
): number => {
	const key = cell ?? EMPTY_CELL;
	const generation = readTextMeasurementGeneration();
	// The floor layoutVisualLines applies, taken here so the fit compares the width it wraps at.
	const contentWidth = Math.max(1, wrapWidth - TEXT_BOX_PADDING_X * 2);
	let entry = cellTextHeightCache.get(key);
	if (entry === undefined || entry.generation !== generation) {
		entry = {
			generation,
			contentWidth: Number.NaN,
			height: 0,
			fitContentWidth: Number.POSITIVE_INFINITY,
			fitHeight: 0,
			widestLineWidth: undefined,
			isWidestLineFitRuledOut: false,
		};
		cellTextHeightCache.set(key, entry);
	}
	if (contentWidth >= entry.fitContentWidth) {
		return entry.fitHeight;
	}
	if (entry.contentWidth === contentWidth) {
		return entry.height;
	}

	const text = isRichText(key.text) ? key.text : "";
	const font = resolveCellFont(key);
	if (
		entry.widestLineWidth !== undefined &&
		contentWidth >= entry.widestLineWidth
	) {
		// Laid out at the widest line rather than at this width: without a break it
		// covers every width down to that line for the cost of this one layout.
		const probeLines = layoutVisualLines(text, font, entry.widestLineWidth);
		const probeContentWidth = Math.max(1, entry.widestLineWidth);
		entry.widestLineWidth = undefined;
		if (isLaidOutAsAuthored(probeLines)) {
			entry.fitContentWidth = probeContentWidth;
			entry.fitHeight = sumBoxHeight(probeLines);
			return entry.fitHeight;
		}
		entry.isWidestLineFitRuledOut = true;
	}

	const lines = layoutVisualLines(text, font, contentWidth);
	const height = sumBoxHeight(lines);
	entry.contentWidth = contentWidth;
	entry.height = height;
	if (isLaidOutAsAuthored(lines)) {
		entry.fitContentWidth = contentWidth;
		entry.fitHeight = height;
		const widestLineWidth = Math.max(...lines.map((line) => line.width));
		entry.widestLineWidth =
			!entry.isWidestLineFitRuledOut && widestLineWidth < contentWidth
				? widestLineWidth
				: undefined;
	}
	return height;
};
