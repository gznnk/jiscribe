import type { Dimensions } from "@jiscribe/geometry";

import { calcTableLayout } from "./calcTableLayout";
import type { TableLayoutState } from "./calcTableLayout";

/**
 * Outer size of a table: the column widths summed, and the resolved row heights
 * summed (see {@link calcTableLayout}, which this reads so the box can never
 * disagree with the grid drawn inside it). What the content resizer stores on the
 * state, the doc holding no size of its own.
 *
 * @param state - The tracks, the cells and the rule width; a state with no tracks measures `0 x 0`
 * @returns The size in local pixels, the cells' text padding included
 */
export const calcTableFrameSize = (state: TableLayoutState): Dimensions => {
	const { width, height } = calcTableLayout(state);
	return { width, height };
};
