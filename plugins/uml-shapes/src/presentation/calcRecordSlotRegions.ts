import type { Dimensions, Rect } from "@workspace/geometry";

import { RECORD_HEADER_HEIGHT } from "../schema/RecordDoc";

/** The record's two compartments, keyed by slot id. */
export type RecordSlotRegions = {
	/** Title band across the top. */
	name: Rect;
	/** Everything below the band. */
	rows: Rect;
};

/**
 * Splits the box into its two compartments, in local coordinates (origin at the
 * shape center, top-left based). Single source of the record's geometry: the
 * drawing (RecordBox) and the text placement (calcRecordTextRegion, which both
 * the overlays and the in-place editor go through) read it, so a hit region can
 * never drift from the text drawn in it.
 *
 * A row that is too long to fit the width wraps and overflows the compartment;
 * the height budget counts rows, not visual lines.
 *
 * @param state - Untransformed box size; a height below the band height shrinks the band rather than producing a negative rows region
 * @returns Both regions, always with a non-negative height
 */
export const calcRecordSlotRegions = (state: Dimensions): RecordSlotRegions => {
	const { width, height } = state;
	const left = -width / 2;
	const top = -height / 2;
	const headerHeight = Math.min(RECORD_HEADER_HEIGHT, Math.max(height, 0));
	return {
		name: { x: left, y: top, width, height: headerHeight },
		rows: {
			x: left,
			y: top + headerHeight,
			width,
			height: Math.max(height, 0) - headerHeight,
		},
	};
};
