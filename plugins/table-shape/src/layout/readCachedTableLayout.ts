import { calcTableLayout } from "./calcTableLayout";
import type { TableLayout, TableLayoutSource } from "./calcTableLayout";

/**
 * The layout last computed for each source object, kept against the object
 * itself: weak, so an entry lives exactly as long as the state it was derived
 * from, and one per object, so one table's reads never evict another's. A state
 * is replaced whenever its grid changes, which is what makes its identity the
 * key: the one input it does not carry is the measurement (see
 * writeTableLayoutCache).
 */
const tableLayoutCache = new WeakMap<TableLayoutSource, TableLayout>();

/**
 * The layout of one table, read from the cache and computed into it on a miss, so
 * the same object is laid out once however many readers ask: the frame renderer
 * asking for every cell's region in turn (calcTableTextRegion), the controls laying
 * their strips beside the same table. A drag makes a new object per move and so
 * computes once per move; without the cache every cell's region re-measured every
 * cell, and a table dragged in cells² measurements.
 *
 * @param source - The tracks, the cells and the rule width; matched by identity, so a state spread from another with the grid untouched is still computed anew
 * @returns The same layout object for the same source until writeTableLayoutCache replaces it
 */
export const readCachedTableLayout = (
	source: TableLayoutSource,
): TableLayout => {
	const cached = tableLayoutCache.get(source);
	if (cached !== undefined) {
		return cached;
	}
	const layout = calcTableLayout(source);
	tableLayoutCache.set(source, layout);
	return layout;
};

/**
 * A layout computed elsewhere, written over `source`'s cache entry: what the
 * content resizer does with the one it lays the table out with, so the object it
 * hands back is read without a second pass. Two cases need it that a read-through
 * miss would not cover: the resizer returns a new object with the box written on
 * it, whose layout is the same (the box is no input of it), and a font finishing
 * to load changes what unchanged text measures, so core runs the resizer on the
 * same object (REMEASURE_TEXT) and the entry under it has to be replaced.
 *
 * @param source - The object the renderers will ask readCachedTableLayout about
 * @param layout - A layout of exactly `source`'s tracks, cells and rule width; nothing checks that it is
 */
export const writeTableLayoutCache = (
	source: TableLayoutSource,
	layout: TableLayout,
): void => {
	tableLayoutCache.set(source, layout);
};
