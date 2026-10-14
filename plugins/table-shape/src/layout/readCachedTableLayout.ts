import { readTextMeasurementGeneration } from "@jiscribe/canvas-sdk/doc";

import { calcTableLayout } from "./calcTableLayout";
import type { TableLayout, TableLayoutSource } from "./calcTableLayout";
import type { TableColumnDoc } from "../schema/TableDoc";

/**
 * One cached layout, with the inputs besides the columns it was computed from and
 * the measurement generation its cells were measured under.
 */
type TableLayoutCacheEntry = {
	generation: number;
	rows: TableLayoutSource["rows"];
	text: TableLayoutSource["text"];
	strokeWidth: TableLayoutSource["strokeWidth"];
	layout: TableLayout;
};

/**
 * The layout last computed for each grid, kept against its `columns` array and
 * matched on the other three inputs by identity. Keyed on the inputs rather than
 * on the object, because a move or a rotation hands over a new object every
 * frame of its drag while leaving all four untouched, and none of them is read
 * by the layout. Weak, so an entry lives exactly as long as the columns it was
 * derived from; one per columns array, so two tables never evict each other
 * unless they share one, which only costs a recomputation. An entry from an
 * earlier measurement generation (web fonts arriving since) misses as well.
 */
const tableLayoutCache = new WeakMap<
	readonly TableColumnDoc[],
	TableLayoutCacheEntry
>();

/**
 * The layout of one table, read from the cache and computed into it on a miss, so
 * the same grid is laid out once however many readers ask: the frame renderer
 * placing every cell (calcTableTextSlotRegions), the in-place editor and the slot
 * outline placing one cell each through the same calculator, the controls laying
 * their strips beside the same table. A move or a rotation keeps the grid, so its
 * drag computes nothing; a drag that rewrites the grid computes once per move.
 *
 * @param source - The tracks, the cells and the rule width; matched by the identity of each, so a state spread from another with the grid untouched hits, and a source with no `columns` is computed every time
 * @returns The same layout object for the same four inputs, until writeTableLayoutCache replaces it or the measurement generation moves on
 */
export const readCachedTableLayout = (
	source: TableLayoutSource,
): TableLayout => {
	if (source.columns === undefined) {
		return calcTableLayout(source);
	}
	const cached = tableLayoutCache.get(source.columns);
	if (
		cached !== undefined &&
		cached.generation === readTextMeasurementGeneration() &&
		cached.rows === source.rows &&
		cached.text === source.text &&
		cached.strokeWidth === source.strokeWidth
	) {
		return cached.layout;
	}
	const layout = calcTableLayout(source);
	writeTableLayoutCache(source, layout);
	return layout;
};

/**
 * A layout computed elsewhere, written over `source`'s cache entry: what the
 * content resizer does with the one it lays the table out with, so the object it
 * hands back is read without a second pass.
 *
 * @param source - The object the renderers will ask readCachedTableLayout about; one with no `columns` is never cached, and the write is dropped
 * @param layout - A layout of exactly `source`'s tracks, cells and rule width, measured under the current measurement generation; nothing checks that it is
 */
export const writeTableLayoutCache = (
	source: TableLayoutSource,
	layout: TableLayout,
): void => {
	if (source.columns === undefined) {
		return;
	}
	tableLayoutCache.set(source.columns, {
		generation: readTextMeasurementGeneration(),
		rows: source.rows,
		text: source.text,
		strokeWidth: source.strokeWidth,
		layout,
	});
};
