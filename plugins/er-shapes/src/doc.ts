// Headless (UI-independent) entry point: what the parser, doc-ops and the schema
// generator need of the ER shapes, with no rendering layer behind it.
//
// e.g. `import { erDocPlugin } from "@jiscribe/plugin-er-shapes/doc";`
import {
	calcPointDocCenter,
	createFrameDocValidator,
	createPointObjectFactory,
	numberOverride,
	type PointObjectSizeCalculator,
} from "@jiscribe/canvas-sdk/doc";
import type {
	CanvasDocPlugin,
	ObjectDoc,
	ObjectDocBoundsCalculator,
	ObjectDocDefinition,
} from "@jiscribe/doc";
import { convertFrameToRect } from "@jiscribe/geometry";

import { calcErEntityLayout } from "./layout/calcErEntityLayout";
import { readErEntityDocLayoutInput } from "./layout/readErEntityLayoutSource";
import type { ErEntityDocLayoutFields } from "./layout/readErEntityLayoutSource";
import { diagnoseErEntityLineBreaks } from "./schema/diagnoseErEntityLineBreaks";
import { erEntityColumnConnectPointIds } from "./schema/erEntityColumnIds";
import {
	ER_ENTITY_DOC_DEFAULTS,
	ER_ENTITY_EXTRA_KEYS,
	ErEntityFeatures,
} from "./schema/ErEntityDoc";
import type { ErEntityDoc } from "./schema/ErEntityDoc";
import { ER_ENTITY_TEXT_SLOT_STYLE_DECLARATION } from "./schema/erEntityTextSlotStyle";
import { validateErEntityFields } from "./schema/validateErEntityFields";

/**
 * An entity's box read off a document of it: the slot widths summed, each fitted
 * to its texts as the canvas draws it, by the derived height. The one measurement
 * both the placement of a new entity (the point factory) and the doc-side box of a
 * saved one ({@link calcErEntityDocBounds}) go through. The cast is what the
 * calculator's untyped doc costs; a field the doc lacks measures as its default
 * (readErEntityDocLayoutInput).
 */
const measureErEntitySize: PointObjectSizeCalculator = (doc) => {
	const { width, height } = calcErEntityLayout(
		readErEntityDocLayoutInput(doc as ErEntityDocLayoutFields),
	);
	return { width, height };
};

/**
 * The box an entity document draws, pinned by the drawn corner the doc stores —
 * the type's `ObjectDocDefinition.bounds`, what reports, aligns and distributes a
 * saved entity.
 *
 * @param doc - Any entity doc, or the merged defaults a factory is about to write; `x` / `y` are read as the drawn top-left corner, each as the origin where it is not a finite number
 * @returns The untransformed box in world coordinates; never null
 */
const calcErEntityDocBounds: ObjectDocBoundsCalculator = (doc) => {
	const size = measureErEntitySize(doc);
	const center = calcPointDocCenter(
		{ x: numberOverride(doc.x, 0), y: numberOverride(doc.y, 0) },
		size,
		doc,
	);
	return convertFrameToRect({ cx: center.x, cy: center.y, ...size });
};

/**
 * The column connect points an entity document offers — the type's
 * `ObjectDocDefinition.extraConnectPointIds`, one left / right pair per entry of
 * `columns`. A doc whose `columns` is not an array offers none.
 */
const calcErEntityExtraConnectPointIds = (
	doc: ObjectDoc,
): readonly string[] => {
	const { columns } = doc as Partial<Pick<ErEntityDoc, "columns">>;
	return Array.isArray(columns)
		? erEntityColumnConnectPointIds(columns.length)
		: [];
};

/**
 * `createFrameObjectDoc` is not used here: it derives a factory from a stored
 * `width` / `height`, and an entity stores neither. The point factory places a new
 * entity by its center, measured from the defaults and overrides; it keeps no
 * `width` or `height` from the overrides, so an entity is created at the
 * defaults' (or a stencil's) slot widths, and the doc ops refuse a width or height
 * for it as they do for any type measured from its content.
 *
 * The slot defaults are `everyTextSlot` (the column slots are as many as the
 * entity has, so no fixed ids), with `byTextSlot` answering for the slots whose
 * id says they have a role (readErEntityTextSlotStyleDefaults).
 */
export const erEntityDocDefinition: ObjectDocDefinition = {
	features: ErEntityFeatures,
	validateDoc: createFrameDocValidator(
		ErEntityFeatures,
		validateErEntityFields,
	),
	factory: createPointObjectFactory<Omit<ErEntityDoc, "id">>(
		ER_ENTITY_DOC_DEFAULTS,
		measureErEntitySize,
	),
	bounds: calcErEntityDocBounds,
	extraConnectPointIds: calcErEntityExtraConnectPointIds,
	diagnoseOverflow: diagnoseErEntityLineBreaks,
	extraKeys: ER_ENTITY_EXTRA_KEYS,
	description:
		'ER diagram entity (IE / crow\'s foot notation): a title band holding "name", then one row per entry of "columns", top to bottom in the array\'s order. `x` / `y` are the top-left of the box; there is no "width" or "height", the width being the row\'s three slot widths summed and the height derived from the column count and the font size. Each row splits into the key gutter (sized to the widest key), the name ("nameWidth" px) and the type ("typeWidth" px); "keyWidth" pins the key gutter in px instead. A slot is drawn at least as wide as its longest text, the box with it, whatever width is stated; the stated width is kept as written and the slot returns to it when the text gets shorter, so leave all three out unless a column has to be wider than its texts — they are written when a person drags the boundaries, the right edge or the width handles. add_object and resize_object take no width or height for an entity: set the slot widths with "nameWidth" / "typeWidth" / "keyWidth" (through extraProps) instead. Each entry of "columns" is one table column with "key", "name" and "type". "key" is free text drawn as written in the key gutter ("PK", "FK", "PK, FK", "UK"); the shape does not interpret it, and the rows are drawn in declared order, so declare the primary key first. Draw a relationship line with connect, passing the FK column\'s "col:<i>:right" as sourceAnchor and the referenced column\'s "col:<j>:left" as targetAnchor ("col:<index>:left" / "col:<index>:right", the index counting the "columns" array from 0). An entity has no typography of its own: each text (the title or a column\'s "key" / "name" / "type") is styled alone, written as { "text": …, "fontSize": …, "fontWeight": …, "fontColor": … } instead of a plain string — write plain strings unless a text has to look different. add_object refuses typography for an entity, and set_style / set_text do not reach its texts: on an existing entity, style them with er_entity_set_text_style and rewrite them with er_entity_set_texts. Add, delete and reorder columns with er_entity_insert_columns / er_entity_delete_columns / er_entity_move_columns, which keep a relationship line on its column; rewriting "columns" wholesale through set_extra_props does not move connectors, so on an entity that has relationships use the column tools.',
	summary: "entity with typed columns (ER diagram)",
	defaults: ER_ENTITY_DOC_DEFAULTS,
	textSlotStyleDefaults: ER_ENTITY_TEXT_SLOT_STYLE_DECLARATION,
};

/**
 * Headless plugin declaration. Registered in `standardDocPlugins`, which the
 * parser, the schema generator and every Node-side host read the shape set from;
 * a type registered in only one of the two lists is dropped from a document
 * without an error.
 */
export const erDocPlugin: CanvasDocPlugin = {
	id: "er-shapes",
	objects: { erEntity: erEntityDocDefinition },
};

// The document shape of an entity, for a headless host that writes one.
export type {
	ErEntityColumnDoc,
	ErEntityDoc,
	ErEntityTextDoc,
} from "./schema/ErEntityDoc";
