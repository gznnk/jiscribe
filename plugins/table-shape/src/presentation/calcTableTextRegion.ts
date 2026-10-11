import type { ObjectTextRegionCalculator } from "@jiscribe/canvas";
import type { Dimensions } from "@jiscribe/geometry";

import type { TableLayoutSource } from "../layout/calcTableLayout";
import { readCachedTableLayout } from "../layout/readCachedTableLayout";

/**
 * Places one cell's text. Registered per type, so display (TextOverlay) and
 * editing (TextEditor) resolve the very same rectangle — the cell rect the rules
 * are drawn around.
 *
 * A slot id with no cell is an invariant broken upstream — a slot is enumerated
 * from `state.text`, the same map the rects are keyed from, and that map is held
 * to the grid (isValidTableGrid) — so it throws rather than answering with some
 * other rectangle, which would draw the text somewhere plausible and hide the
 * breakage as a layout bug.
 */
export const calcTableTextRegion: ObjectTextRegionCalculator<
	Dimensions & TableLayoutSource
> = (state, slotId) => {
	const { cellRects } = readCachedTableLayout(state);
	const cellRect = cellRects[slotId];
	if (cellRect === undefined) {
		throw new Error(
			`calcTableTextRegion: no cell "${slotId}" in a ${state.rows?.length ?? 0}x${state.columns?.length ?? 0} grid`,
		);
	}
	return cellRect;
};
