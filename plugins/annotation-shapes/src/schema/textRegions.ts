// Where the two shapes that take their text inside the box lay it out, declared
// once for both halves of their definitions: the doc definitions (./doc.ts, what
// a headless overflow check measures against) and the UI definitions
// (../definitions.ts, what the overlay draws and the editor edits in).
//
// The three group markers are absent: their label hangs beyond the tip, sized
// from its own text, so they declare `calcOutsideBoxTextRegion` instead.
import type { Rect } from "@jiscribe/geometry";
import { calcInsetRect } from "@jiscribe/geometry";

import type { CalloutDoc } from "./callout/CalloutDoc";
import { CALLOUT_TAIL_RATIO, resolveCalloutTail } from "./callout/CalloutDoc";
import { calcNoteFoldSize } from "./note/calcNoteFoldSize";
import type { NoteDoc } from "./note/NoteDoc";

/**
 * Restricts the region to the bubble body beside the tail band, on whichever
 * edge the tail sits (an absent `tail` reads as the default, down-left).
 *
 * @param shape - The callout's untransformed box and its `tail`; the tail's side is what decides which edge is given up
 * @returns The region in local coordinates (shape center as origin)
 */
export const calcCalloutTextRegion = (
	shape: Pick<CalloutDoc, "width" | "height" | "tail">,
): Rect => {
	const { width, height } = shape;
	const { side } = resolveCalloutTail(shape);
	return calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ [side]: CALLOUT_TAIL_RATIO },
	);
};

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
 * @param shape - The note's untransformed box; a zero width yields the box back rather than NaN
 * @returns The region in local coordinates (shape center as origin)
 */
export const calcNoteTextRegion = ({
	width,
	height,
}: Pick<NoteDoc, "width" | "height">): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ right: width === 0 ? 0 : calcNoteFoldSize(width, height) / width },
	);
