import type { ObjectMapperType } from "@jiscribe/canvas";
import { createFrameMapper } from "@jiscribe/canvas-sdk";
import { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc";

import { resizeTableStateToContent } from "./resizeTableStateToContent";
import type { TableState } from "./TableState";
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
 * The Frame-family mapper, which maps every box-shaped state whatever its doc
 * spells the box as — here a position alone, the grid answering for the size
 * (TableFeatures). It carries the id, the meta, the transform and the stroke
 * group; the grid is put on top of it below.
 */
const frameMapper = createFrameMapper<TableDoc, TableState>(TableFeatures);

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
 * TableDoc -> TableState: the grid moved into the keyed slot map the text machinery
 * reads, and the box derived from that grid.
 *
 * The box is derived here rather than left to the type's `contentResizer` alone: a
 * state of zero size reaching a caller that never runs the resizer (doc ops, a
 * headless measurement) would be read as a table with no extent at all.
 */
export const tableToState: ObjectMapperType<TableDoc, TableState>["toState"] = (
	doc,
) => {
	const state = frameMapper.toState(doc);
	return resizeTableStateToContent({
		...state,
		columns: cloneColumns(doc.columns),
		rows: cloneRows(doc.rows),
		text: mapCellsToSlots(doc.cells, doc.rows.length, doc.columns.length),
	});
};

/**
 * TableState -> TableDoc: the slot map folded back into the grid, and the derived
 * box dropped in favour of the corner it was grown from.
 */
export const tableToDoc: ObjectMapperType<TableDoc, TableState>["toDoc"] = (
	state,
) => {
	const doc: Record<string, unknown> = { ...frameMapper.toDoc(state) };
	// The one key the shared mapper writes that a table doc has no place for: the
	// keyed slot map, which a table spells out as `cells` instead. The box it
	// leaves out by itself, a point geometry storing none.
	delete doc.text;
	return {
		...doc,
		columns: cloneColumns(state.columns),
		rows: cloneRows(state.rows),
		cells: mapSlotsToCells(state),
	} as TableDoc;
};
