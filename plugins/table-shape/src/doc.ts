// Headless (UI-independent) entry point: what the parser, doc-ops and the schema
// generator need of the table, with no rendering layer behind it.
//
// e.g. `import { tableDocPlugin } from "@jiscribe/plugin-table-shape/doc";`
import {
	calcPointDocCenter,
	createFrameDocValidator,
	createPointObjectFactory,
	numberOverride,
	type PointObjectSizeCalculator,
} from "@jiscribe/canvas-sdk/doc";
import { calcOutsideBoxTextRegion } from "@jiscribe/doc";
import type {
	CanvasDocPlugin,
	ObjectDocBoundsCalculator,
	ObjectDocDefinition,
} from "@jiscribe/doc";
import { convertFrameToRect } from "@jiscribe/geometry";

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
 * The grid's own size, read off a document of it: the one measurement both the
 * placement of a new table (the point factory) and the doc-side box of a saved one
 * ({@link calcTableDocBounds}) go through. The cast is what the calculator's untyped
 * doc costs — `calcTableDocFrameSize` reads only the axes and the rule width, and a
 * doc missing either axis measures as an empty grid.
 */
const measureTableSize: PointObjectSizeCalculator = (doc) =>
	calcTableDocFrameSize(doc as TableDocLayoutSource);

/**
 * The box a table document draws: the grid's own extent, pinned by the drawn corner
 * the doc stores. The type's `ObjectDocDefinition.bounds` — what reports, aligns and
 * distributes a saved table — measured by the same measurement the factory places a
 * new one with, so the two agree on where the table ends.
 *
 * @param doc - Any table doc, or the merged defaults a factory is about to write; `x` / `y` are read as the drawn top-left corner, each as the origin where it is not a finite number, and the measurement reads the axes, the cells and the rule width ({@link measureTableSize})
 * @returns The untransformed box in world coordinates, centred where the stored corner puts the measured grid; never null, a doc with no axes measuring `0 x 0` on that corner
 */
const calcTableDocBounds: ObjectDocBoundsCalculator = (doc) => {
	const size = measureTableSize(doc);
	const center = calcPointDocCenter(
		{ x: numberOverride(doc.x, 0), y: numberOverride(doc.y, 0) },
		size,
		doc,
	);
	return convertFrameToRect({ cx: center.x, cy: center.y, ...size });
};

/**
 * `createFrameObjectDoc` is not used here: it derives a factory from a stored
 * `width` / `height`, and a table's box is the grid's answer rather than the
 * document's (TableFeatures). The three fields it would have filled in are
 * spelled out instead. The point factory is handed the grid's own measurement, so a
 * table is placed by its center like every other shape, and `bounds` pins that same
 * measurement to the stored corner for the doc-ops to measure a saved table by
 * ({@link calcTableDocBounds}).
 *
 * `textRegion` says the box does not hold the text, the same answer the record
 * gives: the box is divided into cells each sized from its own text, so no width
 * or height can make a cell overflow — there is nothing for the headless overflow
 * check to measure.
 *
 * The cell defaults are declared as `everySlot` rather than per slot: a table's
 * slots are its cells, as many as the grid is wide and tall, so there is no fixed
 * set of ids to key them by.
 */
export const tableDocDefinition: ObjectDocDefinition = {
	features: TableFeatures,
	validateDoc: createFrameDocValidator(TableFeatures, validateTableFields),
	factory: createPointObjectFactory<Omit<TableDoc, "id">>(
		TABLE_DOC_DEFAULTS,
		measureTableSize,
	),
	bounds: calcTableDocBounds,
	textRegion: calcOutsideBoxTextRegion,
	extraKeys: TABLE_EXTRA_KEYS,
	description:
		'A grid of cells. `x` / `y` are the top-left of the grid; its width is the column widths summed and its height the resolved row heights summed, so neither is stored. A row\'s `height` is a lower bound: the row is drawn as tall as its tallest cell\'s text needs, never clipping it. `cells` is dense — exactly one row per entry of "rows" and one cell per entry of "columns" — and a cell carrying nothing but text may be written as that text alone. Each cell holds its own typography and its own `fill`; there are no shape-wide text fields.',
	summary: "grid of cells (table)",
	defaults: TABLE_DOC_DEFAULTS,
	textSlotStyleDefaults: { everySlot: TABLE_CELL_STYLE_DEFAULTS },
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
