import type { ObjectTextRegionCalculator } from "@jiscribe/canvas";
import type { Dimensions } from "@jiscribe/geometry";
import { calcInsetRect } from "@jiscribe/geometry";

import { calcNoteFoldSize } from "./calcNoteFoldSize";

/**
 * Keeps the text clear of the fold by pulling in the right edge, and leaves the
 * other three on the box — the note is a prose box, so it gets the whole of it
 * bar the corner it cannot use (the same shape of rule as the callout, which
 * only gives up the band its tail sits on).
 *
 * Paying for the fold in width rather than in height is deliberate: dropping the
 * top edge below the fold would cost a whole line across the full width, while
 * the right inset only wraps the lines a little earlier. With the type's
 * left-aligned default the gap it leaves is not even visible.
 *
 * @param state The shape's box; a zero width yields the box back rather than NaN.
 * @param slotId Unused — the note has the one body slot.
 * @returns The text rectangle in local coordinates (shape center as origin).
 */
export const calcNoteTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ right: width === 0 ? 0 : calcNoteFoldSize(width, height) / width },
	);
