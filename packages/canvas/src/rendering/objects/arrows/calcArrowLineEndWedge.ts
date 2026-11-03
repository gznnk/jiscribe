import { ARROW_OUTLINE_THINNING_SCALE } from "@jiscribe/doc/model/objects/base/ArrowStyleDoc";
import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";

import type { ArrowLineEndWedge } from "./ArrowTypes";
import { OPEN_ARROW_THIN_OUTLINE_LINE_INSET } from "./shapes/OpenArrow";

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
