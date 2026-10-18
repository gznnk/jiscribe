import {
	calcVisualTextHeight,
	TEXT_BOX_PADDING_X,
} from "@jiscribe/canvas-sdk/doc";
import type { Rect } from "@jiscribe/geometry";

import {
	calcErEntitySlotFloors,
	fitErEntityStatedSlotWidths,
	sumErEntitySlotWidths,
} from "./erEntitySlotWidths";
import type { ErEntitySlotFloors } from "./erEntitySlotWidths";
import { readErEntityTextSlotsLayoutSource } from "./readErEntityLayoutSource";
import type {
	ErEntityLayoutInput,
	ErEntityLayoutSource,
} from "./readErEntityLayoutSource";
import {
	calcErEntityRowHeight,
	ER_ENTITY_HEADER_PADDING_Y_TOTAL,
} from "../schema/ErEntityDoc";

/** One drawn row. */
export type ErEntityRowLayout = {
	/** Index into the declared columns, which the row's slot and connect point ids carry. */
	columnIndex: number;
	/** The row's band: the whole box width, its own row pitch tall, local coordinates. */
	band: Rect;
};

/**
 * The entity laid out in local coordinates (shape center as origin, top-left
 * based rects). The single source of where everything sits: the drawing, the
 * text slot regions, the connect points, the controls and the content resizer
 * all read it (through readCachedErEntityLayout on the canvas side).
 */
export type ErEntityLayout = {
	/** Box width: the three drawn slot widths summed (sumErEntitySlotWidths). */
	width: number;
	/** Box height: the title band plus the rows, never stored. */
	height: number;
	/** Title band, at the top. */
	header: Rect;
	/** Drawn width of the key gutter at the left of every row: the stated one, or the widest key's, never under the key floor. */
	keyWidth: number;
	/** Drawn width of the name column in the middle of every row: the stated one, never under its floor. */
	nameWidth: number;
	/** Drawn width of the type column at the right of every row: the stated one, never under its floor. */
	typeWidth: number;
	/** The narrowest each slot fits its texts at (calcErEntitySlotFloors). */
	slotFloors: ErEntitySlotFloors;
	/** Every row, top to bottom in declared order from the title band's bottom edge; empty for an entity of no columns. */
	rows: ErEntityRowLayout[];
};

/**
 * Height of the title band: its text wrapped in the box width plus the band's
 * padding, so a long name or a larger type size grows the band (28 for one line
 * at the default size).
 */
const calcHeaderHeight = (
	source: ErEntityLayoutSource,
	width: number,
): number =>
	calcVisualTextHeight(
		source.name,
		source.nameFont,
		Math.max(width - TEXT_BOX_PADDING_X * 2, 0),
	) + ER_ENTITY_HEADER_PADDING_Y_TOTAL;

/**
 * Lays the entity out (see {@link ErEntityLayout}). Every slot is drawn at its
 * stated width widened to its floor (fitErEntityStatedSlotWidths), and the box is
 * their sum; the height is the title band — its text wrapped in that width — and
 * one row per column at the row's own pitch, one row's height for an entity of
 * no columns. The keys never move the height.
 *
 * Measures every text; the canvas side reads it through readCachedErEntityLayout
 * rather than calling it per reader.
 *
 * @param input - The entity's stated slot widths and slots; its box is not read
 * @returns The layout, centered on the origin; 28 + 125 = 153 tall for five columns at the defaults
 */
export const calcErEntityLayout = (
	input: ErEntityLayoutInput,
): ErEntityLayout => {
	const source = readErEntityTextSlotsLayoutSource(input);
	const slotFloors = calcErEntitySlotFloors(source);
	const { keyWidth, nameWidth, typeWidth } = fitErEntityStatedSlotWidths(
		source,
		slotFloors,
	);
	const width = sumErEntitySlotWidths({ keyWidth, nameWidth, typeWidth });
	const headerHeight = calcHeaderHeight(source, width);
	const rowHeights = source.columns.map((column) =>
		calcErEntityRowHeight(column.fontSize),
	);
	const rowsHeight =
		rowHeights.length === 0
			? calcErEntityRowHeight(source.emptyRowFontSize)
			: rowHeights.reduce((total, rowHeight) => total + rowHeight, 0);
	const height = headerHeight + rowsHeight;
	const left = -width / 2;
	const top = -height / 2;

	const rows: ErEntityRowLayout[] = [];
	let rowTop = top + headerHeight;
	rowHeights.forEach((rowHeight, columnIndex) => {
		rows.push({
			columnIndex,
			band: { x: left, y: rowTop, width, height: rowHeight },
		});
		rowTop += rowHeight;
	});

	return {
		width,
		height,
		header: { x: left, y: top, width, height: headerHeight },
		keyWidth,
		nameWidth,
		typeWidth,
		slotFloors,
		rows,
	};
};
