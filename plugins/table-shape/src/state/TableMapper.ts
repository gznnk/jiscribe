import type { ObjectMapperType } from "@jiscribe/canvas";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
	ObjectMapper,
} from "@jiscribe/canvas-sdk";
import { collectStyleKeys, roundDocCoordinate } from "@jiscribe/canvas-sdk/doc";
import { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc";
import {
	calcFrameCenterFromTopLeft,
	calcFrameKeyPoint,
} from "@jiscribe/geometry";

import type { TableState } from "./TableState";
import { calcTableFrameSize } from "../layout/calcTableFrameSize";
import { mapCellsToSlots } from "../schema/mapCellsToSlots";
import { tableCellSlotId, TableFeatures } from "../schema/TableDoc";
import type {
	TableCell,
	TableCellDoc,
	TableColumnDoc,
	TableDoc,
	TableRowDoc,
} from "../schema/TableDoc";

/**
 * The fields that read the same on a doc and on a state, so the mapper carries
 * them across untouched: the style groups the features enable, which for a table
 * is the stroke group alone (`collectStyleKeys`).
 *
 * The grid's own three fields (TABLE_EXTRA_KEYS) are deliberately not here. All
 * three are converted rather than carried: the two tracks are cloned, and `cells`
 * changes form entirely on the way to `text`.
 */
const TABLE_PASSTHROUGH_KEYS = collectStyleKeys(TableFeatures);

/**
 * The passthrough fields `src` owns. An allow-list rather than a copy, for the
 * reason the shared mapper picks by one: nothing a runtime state carries on its
 * own (id / parentId / minWidth) can then leak into the document.
 */
const pickPassthrough = (
	src: Readonly<Record<string, unknown>>,
): Record<string, unknown> => {
	const picked: Record<string, unknown> = {};
	for (const key of TABLE_PASSTHROUGH_KEYS) {
		if (Object.prototype.hasOwnProperty.call(src, key)) {
			picked[key] = src[key];
		}
	}
	return picked;
};

/**
 * Whether a cell carries nothing but its text, and so may be written back as that
 * text alone. Both halves matter: a `fill` is the type's own field on a slot, and
 * the five style fields are the ones a cell shares with every other slot.
 */
const isTextOnlyCell = (cell: TableCell): boolean =>
	cell.fill === undefined &&
	TEXT_SLOT_STYLE_KEYS.every((key) => cell[key] === undefined);

/** The inverse of {@link mapCellsToSlots}, folding every unstyled cell to its text. */
const mapSlotsToCells = (state: TableState): TableCellDoc[][] => {
	const cells: TableCellDoc[][] = [];
	for (let row = 0; row < state.rows.length; row++) {
		const rowCells: TableCellDoc[] = [];
		for (let column = 0; column < state.columns.length; column++) {
			const cell = state.text[tableCellSlotId(row, column)];
			if (cell === undefined) {
				rowCells.push("");
				continue;
			}
			rowCells.push(isTextOnlyCell(cell) ? cell.text : { ...cell });
		}
		cells.push(rowCells);
	}
	return cells;
};

/** Fresh column entries, so two tables created from the same doc defaults share none. */
const cloneColumns = (columns: readonly TableColumnDoc[]): TableColumnDoc[] =>
	columns.map((column) => ({ ...column }));

/** Fresh row entries, for the same reason as {@link cloneColumns}. */
const cloneRows = (rows: readonly TableRowDoc[]): TableRowDoc[] =>
	rows.map((row) => ({ ...row }));

/**
 * TableDoc -> TableState: the grid moved into the keyed slot map the text
 * machinery reads, and the box measured from that grid.
 *
 * Written out rather than built from `createFrameMapper`, which refuses a
 * `geometry: "point"` type: the doc holds the corner the table is drawn from and
 * nothing about its size, so the box is measured here — by the same layout the
 * content resizer keeps it at (calcTableFrameSize) — instead of a placeholder
 * being handed out for the resizer to grow. A state that never reaches the
 * derivation pass (doc ops, a headless measurement) would otherwise read as a
 * table with no extent at all.
 */
export const tableToState: ObjectMapperType<TableDoc, TableState>["toState"] = (
	doc,
) => {
	const columns = cloneColumns(doc.columns);
	const rows = cloneRows(doc.rows);
	const text = mapCellsToSlots(doc.cells, doc.rows.length, doc.columns.length);
	const transform = mapTransformDocToState(doc);
	const size = calcTableFrameSize({
		columns,
		rows,
		text,
		strokeWidth: doc.strokeWidth,
	});
	// The doc's (x, y) is the drawn top-left, so the center is that corner plus the
	// transformed half-diagonal. Left unrounded: rounding both directions would
	// round the coordinate twice on a doc round trip.
	const center = calcFrameCenterFromTopLeft(
		{ x: doc.x, y: doc.y },
		size,
		transform,
	);

	return {
		...ObjectMapper.toState(doc),
		...pickPassthrough(doc),
		...transform,
		type: "table",
		cx: center.x,
		cy: center.y,
		width: size.width,
		height: size.height,
		columns,
		rows,
		text,
	} as TableState;
};

/**
 * TableState -> TableDoc: the slot map folded back into the grid, and the derived
 * box dropped in favour of the corner it was measured around. The keyed slot map
 * is never written: a table spells its cells out as `cells` instead.
 */
export const tableToDoc: ObjectMapperType<TableDoc, TableState>["toDoc"] = (
	state,
) => {
	const drawnTopLeft = calcFrameKeyPoint(state, "topLeft");

	return {
		...ObjectMapper.toDoc(state),
		...pickPassthrough(state),
		...mapTransformStateToDoc(state),
		type: "table",
		// Rounded because the transform makes the round trip exact only to a float
		// epsilon, and two callers read the doc as an exact value: the mapper
		// round-trip test compares docs with toEqual, and isSameCanvasDocContent
		// stringifies the doc to decide whether the file is dirty.
		x: roundDocCoordinate(drawnTopLeft.x),
		y: roundDocCoordinate(drawnTopLeft.y),
		columns: cloneColumns(state.columns),
		rows: cloneRows(state.rows),
		cells: mapSlotsToCells(state),
	} as TableDoc;
};
