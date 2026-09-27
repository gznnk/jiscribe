// Headless (UI-independent) entry point: what the parser, doc-ops and the schema
// generator need of the table, with no rendering layer behind it.
//
// e.g. `import { tableDocPlugin } from "@jiscribe/plugin-table-shape/doc";`
import {
	createFrameDocValidator,
	createPointObjectFactory,
	EVERY_TEXT_SLOT_ID,
} from "@jiscribe/canvas-sdk/doc";
import { calcOutsideBoxTextRegion } from "@jiscribe/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";

import { calcTableDocFrameSize } from "./layout/calcTableDocFrameSize";
import type { TableDocLayoutSource } from "./layout/calcTableDocFrameSize";
import {
	TABLE_CELL_STYLE_DEFAULTS,
	TABLE_DOC_DEFAULTS,
	TABLE_EXTRA_KEYS,
	TableFeatures,
} from "./schema/TableDoc";
import type { TableDoc } from "./schema/TableDoc";
import { validateTableFields } from "./schema/validateTableFields";

/**
 * `createFrameObjectDoc` is not used here: it derives a factory from a stored
 * `width` / `height`, and a table's box is the grid's answer rather than the
 * document's (TableFeatures). The three fields it would have filled in are
 * spelled out instead. The point factory is handed the grid's own measurement, so a
 * table is placed by its center like every other shape.
 *
 * `textRegion` says the box does not hold the text, the same answer the record
 * gives: the box is divided into cells each sized from its own text, so no width
 * or height can make a cell overflow — there is nothing for the headless overflow
 * check to measure.
 *
 * The cell defaults are declared under `EVERY_TEXT_SLOT_ID` rather than per slot:
 * a table's slots are its cells, as many as the grid is wide and tall, so there
 * is no fixed set of ids to key them by.
 */
export const tableDocDefinition: ObjectDocDefinition = {
	features: TableFeatures,
	validateDoc: createFrameDocValidator(TableFeatures, validateTableFields),
	factory: createPointObjectFactory<Omit<TableDoc, "id">>(
		TABLE_DOC_DEFAULTS,
		(doc) => calcTableDocFrameSize(doc as TableDocLayoutSource),
	),
	textRegion: calcOutsideBoxTextRegion,
	extraKeys: TABLE_EXTRA_KEYS,
	description:
		'A grid of cells. `x` / `y` are the top-left of the grid; its width is the column widths summed and its height the resolved row heights summed, so neither is stored. A row\'s `height` is a lower bound: the row is drawn as tall as its tallest cell\'s text needs, never clipping it. `cells` is dense — exactly one row per entry of "rows" and one cell per entry of "columns" — and a cell carrying nothing but text may be written as that text alone. Each cell holds its own typography and its own `fill`; there are no shape-wide text fields.',
	summary: "grid of cells (table)",
	defaults: TABLE_DOC_DEFAULTS,
	textSlotStyleDefaults: { [EVERY_TEXT_SLOT_ID]: TABLE_CELL_STYLE_DEFAULTS },
};

/**
 * Headless plugin declaration. Registered in `standardDocPlugins`, which the
 * parser, the schema generator and every Node-side host read the shape set from;
 * a type registered in only one of the two lists is dropped from a document
 * without an error.
 */
export const tableDocPlugin: CanvasDocPlugin = {
	id: "table-shape",
	objects: { table: tableDocDefinition },
};
