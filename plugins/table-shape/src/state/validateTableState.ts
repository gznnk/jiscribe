import {
	isArray,
	isCssSafeValue,
	isNumber,
	isObject,
} from "@jiscribe/basic-validators";
import type { ObjectStateValidator } from "@jiscribe/canvas";
import { createFrameStateValidator } from "@jiscribe/canvas-sdk";
import type { StateRecord } from "@jiscribe/canvas-sdk";
import { isRichText, isTextRows, isTextSlot } from "@jiscribe/doc";

import {
	tableCellSlotIds,
	TABLE_MIN_COLUMN_WIDTH,
	TABLE_MIN_ROW_HEIGHT,
	TableFeatures,
} from "../schema/TableDoc";

/** One column: the stored width, within the bound the doc side holds it to. */
const isTableColumn = (value: unknown): boolean =>
	isObject(value) &&
	isNumber(value.width) &&
	value.width >= TABLE_MIN_COLUMN_WIDTH;

/** One row: the optional lower bound on how tall it is drawn. */
const isTableRow = (value: unknown): boolean =>
	isObject(value) &&
	(value.height === undefined ||
		(isNumber(value.height) && value.height >= TABLE_MIN_ROW_HEIGHT));

/**
 * One cell holds one body of text: the plain string it is, or the runs parts of it
 * are styled in. The row-partitioned form a compartment takes is refused although
 * the shared slot guard admits it — `TableCellDoc` has no way to write rows, so a
 * cell holding them would be drawn and edited yet save a document the doc
 * validator refuses on the next open.
 */
const isCellText = (value: unknown): boolean =>
	isRichText(value) && !isTextRows(value);

/**
 * One cell: a text slot holding one body, plus the background a table adds to one.
 * The background is held to the same check the doc side gives it: it is inlined
 * into a CSS declaration, and state arriving from a paste has not been through the
 * parser.
 */
const isTableCell = (value: unknown): boolean => {
	if (!isObject(value)) {
		return false;
	}
	// Read before the slot guard narrows the value: `fill` is the table's own field,
	// which `TextSlot` does not declare.
	if (value.fill !== undefined && !isCssSafeValue(value.fill)) {
		return false;
	}
	return isTextSlot(value) && isCellText(value.text);
};

/** A non-empty array whose every entry passes `isEntry`. */
const isAxis = (
	value: unknown,
	isEntry: (entry: unknown) => boolean,
): value is unknown[] =>
	isArray(value) && value.length > 0 && value.every(isEntry);

/**
 * Pins the table's one invariant on untrusted state (clipboard, external sync):
 * the cells are exactly the grid's, keyed row by row. The shared text check only
 * knows the general keyed form (any key, any count), so without this a pasted
 * table could arrive with a cell the grid has no place to draw, or be missing one
 * the grid draws — which reads as an empty cell yet is written back by the mapper
 * as `""`, quietly changing the document.
 *
 * The key *order* is checked, not just the key set: it is what makes the first key
 * the top-left cell and what Tab walks (TextSlots), so a reordered map would draw
 * correctly and step through the table wrongly.
 */
const hasTableCells = (o: StateRecord): boolean => {
	if (!isAxis(o.columns, isTableColumn) || !isAxis(o.rows, isTableRow)) {
		return false;
	}
	const text = o.text;
	if (!isObject(text)) {
		return false;
	}
	const cellIds = tableCellSlotIds(o.rows.length, o.columns.length);
	const keys = Object.keys(text);
	if (keys.length !== cellIds.length) {
		return false;
	}
	if (keys.some((key, index) => key !== cellIds[index])) {
		return false;
	}
	return Object.values(text).every(isTableCell);
};

/** Validates TableState (Frame-family common logic + the grid and its cells). */
export const isValidTableState: ObjectStateValidator =
	createFrameStateValidator(TableFeatures, hasTableCells);
