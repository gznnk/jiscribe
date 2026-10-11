import type { Dimensions } from "@jiscribe/geometry";

import { calcTableLayout } from "./calcTableLayout";
import type { TableLayoutSource } from "./calcTableLayout";

/**
 * Outer size of a table: the column widths summed, and the resolved row heights
 * summed (see calcTableLayout, so the box can never disagree with the grid drawn
 * inside it). What a grid rewrite stores on the state, the doc holding no size of
 * its own. Computed outright, not through the layout cache (readCachedTableLayout):
 * the callers size objects nobody renders — a grid being rewritten, a doc being
 * sized — and an entry under those would never be read.
 *
 * @param state - The tracks, the cells and the rule width; a source with no tracks measures `0 x 0`
 * @returns The size in local pixels, the cells' text padding included
 */
export const calcTableFrameSize = (state: TableLayoutSource): Dimensions => {
	const { width, height } = calcTableLayout(state);
	return { width, height };
};
