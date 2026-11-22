import { OPEN_ARROW_THIN_OUTLINE_LINE_INSET } from "./arrowHeadDimensions";
import { ARROW_OUTLINE_THINNING_SCALE } from "../base/ArrowStyleDoc";
import type { ArrowType } from "../types/ArrowType";

/**
 * Where a line stopped short of a head's tip ends, in the head's local units
 * (the tip at (0,0), the line trailing toward -x).
 */
export type ArrowLineEndWedge = {
	/** Distance from the tip back to the line's end. */
	inset: number;
	/** Half the line's width. */
	lineHalfWidth: number;
};

/**
 * Width (local units, before the head's `strokeWidth × arrowScale` scale) of the
 * strokes a line-drawn head is built from.
 *
 * @param arrowScale - The resolved factor on the head's size (`arrowScale`, 1 when unset)
 * @returns `1 / max(arrowScale, ARROW_OUTLINE_THINNING_SCALE)`: the line's own stroke width in
 *   world units from that scale up, `strokeWidth × arrowScale / ARROW_OUTLINE_THINNING_SCALE` below it
 */
export const calcArrowOutlineWidth = (arrowScale: number): number =>
	1 / Math.max(arrowScale, ARROW_OUTLINE_THINNING_SCALE);

/**
 * The wedge an OpenArrow fills between the line's end and its tip once its
 * outline has thinned (calcArrowLineInset stops the line short there): a square
 * line end inside the V leaves either a gap before the tip or corners past the
 * arms, and the wedge closes the gap.
 *
 * @param type - The end's mark; only "OpenArrow" has a wedge
 * @param arrowScale - The resolved factor on the head's size (`arrowScale`, 1 when unset); from ARROW_OUTLINE_THINNING_SCALE up there is none
 * @returns The wedge in the head's local units (the line's stroke width being `1 / arrowScale` there), or undefined when none is drawn
 */
export const calcArrowLineEndWedge = (
	type: ArrowType | undefined,
	arrowScale: number,
): ArrowLineEndWedge | undefined =>
	type === "OpenArrow" && arrowScale < ARROW_OUTLINE_THINNING_SCALE
		? {
				inset: OPEN_ARROW_THIN_OUTLINE_LINE_INSET / arrowScale,
				lineHalfWidth: 0.5 / arrowScale,
			}
		: undefined;
