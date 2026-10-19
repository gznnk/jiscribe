import type { ObjectTextSlotRegionsCalculator } from "@jiscribe/canvas";
import type { Dimensions } from "@jiscribe/geometry";

import type { TableLayoutSource } from "../layout/calcTableLayout";
import { readCachedTableLayout } from "../layout/readCachedTableLayout";

/**
 * Places every cell's text in one call: the cell rects the rules are drawn
 * around. Registered per type, so display (TextOverlay) and editing (TextEditor)
 * resolve the very same rectangle.
 */
export const calcTableTextSlotRegions: ObjectTextSlotRegionsCalculator<
	Dimensions & TableLayoutSource
> = (state) => readCachedTableLayout(state).cellRects;
