import type { ObjectTextRegionCalculator } from "@jiscribe/canvas";
import type { Dimensions } from "@jiscribe/geometry";

import type { TableLayoutSource } from "../layout/calcTableLayout";
import { readCachedTableLayout } from "../layout/readCachedTableLayout";

/**
 * Places one cell's text. Registered per type, so display (TextOverlay) and
 * editing (TextEditor) resolve the very same rectangle — the cell rect the rules
 * are drawn around.
 *
 * A slot id with no cell cannot reach here in practice (a slot is enumerated from
 * `state.text`, the same map the rects are keyed from), so it falls back to the
 * table's own box — what an unregistered type would have been given (see
 * calcTextRegion) — rather than inventing a cell.
 */
export const calcTableTextRegion: ObjectTextRegionCalculator<
	Dimensions & TableLayoutSource
> = (state, slotId) => {
	const { cellRects, width, height } = readCachedTableLayout(state);
	return cellRects[slotId] ?? { x: -width / 2, y: -height / 2, width, height };
};
