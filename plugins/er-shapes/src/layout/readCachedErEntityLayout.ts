import { readTextMeasurementGeneration } from "@jiscribe/canvas-sdk/doc";

import {
	calcErEntityLayout,
	calcErEntityLayoutOfMeasurement,
	measureErEntityTexts,
} from "./calcErEntityLayout";
import type {
	ErEntityLayout,
	ErEntityTextMeasurement,
} from "./calcErEntityLayout";
import type { ErEntityLayoutInput } from "./readErEntityLayoutSource";

/**
 * One cached layout, with every input besides the slots it was computed from and
 * the measurement generation its texts were measured under.
 */
type ErEntityLayoutCacheEntry = {
	generation: number;
	keyWidth: ErEntityLayoutInput["keyWidth"];
	nameWidth: ErEntityLayoutInput["nameWidth"];
	typeWidth: ErEntityLayoutInput["typeWidth"];
	layout: ErEntityLayout;
};

/** One slot map's texts as measured, with the measurement generation they were measured under. */
type ErEntityTextMeasurementCacheEntry = {
	generation: number;
	measurement: ErEntityTextMeasurement;
};

/**
 * How many layouts are kept per slot map. Two, because a slot width drag lays
 * out the entity it started from and the one it hands back in the same frame,
 * and the two share their slots.
 */
const ER_ENTITY_LAYOUT_CACHE_ENTRIES_PER_TEXT = 2;

/**
 * The layouts last computed for each slot map, most recent first, matched on
 * the other inputs by value. Keyed on `text` rather than on the object because
 * a move or a rotation hands over a new object every frame of its drag while
 * leaving the slots untouched, and the box is not read by the layout. Weak, so an
 * entry lives exactly as long as the slots it was derived from.
 */
const erEntityLayoutCache = new WeakMap<object, ErEntityLayoutCacheEntry[]>();

/**
 * The texts of each slot map as last measured, keyed like erEntityLayoutCache:
 * a drag that changes the widths alone misses that cache every frame and lays
 * out from here without measuring a slot.
 */
const erEntityTextMeasurementCache = new WeakMap<
	object,
	ErEntityTextMeasurementCacheEntry
>();

/** Whether an entry was computed from exactly `input`'s widths under the current generation. */
const isEntryOf = (
	entry: ErEntityLayoutCacheEntry,
	input: ErEntityLayoutInput,
	generation: number,
): boolean =>
	entry.generation === generation &&
	entry.keyWidth === input.keyWidth &&
	entry.nameWidth === input.nameWidth &&
	entry.typeWidth === input.typeWidth;

/** `input`'s texts measured under `generation`, read from the cache and measured into it on a miss. */
const readCachedErEntityTextMeasurement = (
	text: object,
	input: ErEntityLayoutInput,
	generation: number,
): ErEntityTextMeasurement => {
	const cached = erEntityTextMeasurementCache.get(text);
	if (cached !== undefined && cached.generation === generation) {
		return cached.measurement;
	}
	const measurement = measureErEntityTexts(input);
	erEntityTextMeasurementCache.set(text, { generation, measurement });
	return measurement;
};

/**
 * The layout of one entity (calcErEntityLayout), read from the cache and computed
 * into it on a miss, so the same entity is laid out once however many readers
 * ask: the content resizer, the drawing, the slot regions, the connect points,
 * the column part's region and the selection controls. A move or a rotation
 * keeps the slots and the widths, so its drag computes nothing; a drag that
 * changes the widths alone keeps the slots, so it lays out without measuring
 * them again; an edit measures once, in the content resizer, and every reader
 * of the state it returns hits. An entry from an earlier measurement generation
 * (web fonts arriving since) misses, so a layout measured with a fallback font
 * is never handed back.
 *
 * @param input - The entity's stated slot widths and slots; matched by the identity of `text` and the value of every other field, so a state spread from another with those untouched hits, and an input with no `text` is computed every time
 * @returns The same layout object for the same inputs until the measurement generation moves on; read only, as every reader of the same entity shares it
 */
export const readCachedErEntityLayout = (
	input: ErEntityLayoutInput,
): ErEntityLayout => {
	if (input.text === undefined) {
		return calcErEntityLayout(input);
	}
	const generation = readTextMeasurementGeneration();
	const entries = erEntityLayoutCache.get(input.text) ?? [];
	const cached = entries.find((entry) => isEntryOf(entry, input, generation));
	if (cached !== undefined) {
		return cached.layout;
	}
	const layout = calcErEntityLayoutOfMeasurement(
		input,
		readCachedErEntityTextMeasurement(input.text, input, generation),
	);
	erEntityLayoutCache.set(input.text, [
		{
			generation,
			keyWidth: input.keyWidth,
			nameWidth: input.nameWidth,
			typeWidth: input.typeWidth,
			layout,
		},
		...entries.slice(0, ER_ENTITY_LAYOUT_CACHE_ENTRIES_PER_TEXT - 1),
	]);
	return layout;
};
