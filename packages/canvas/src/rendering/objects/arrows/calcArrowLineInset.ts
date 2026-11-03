import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";

import { calcArrowLineEndWedge } from "./calcArrowLineEndWedge";
import { getArrowLineInset } from "./getArrowLineInset";

/**
 * How far short of the tip (world units) a line stops under the head at that
 * end: the type's own inset (getArrowLineInset) plus the inset of the wedge the
 * head fills past the line's end (calcArrowLineEndWedge), both at the head's
 * scale.
 *
 * @param type - The end's mark; undefined and "None" stop nothing short
 * @param strokeWidth - The line's resolved stroke width (world units)
 * @param arrowScale - The resolved factor on the head's size (`arrowScale`, 1 when unset)
 * @returns The distance to pull the line's end back along its last segment
 */
export const calcArrowLineInset = (
	type: ArrowType | undefined,
	strokeWidth: number,
	arrowScale: number,
): number => {
	// The wedge a head fills past the line's end is what decides how far short
	// the line stops, so the two cannot disagree.
	const wedgeInset = calcArrowLineEndWedge(type, arrowScale)?.inset ?? 0;
	return (getArrowLineInset(type) + wedgeInset) * strokeWidth * arrowScale;
};
