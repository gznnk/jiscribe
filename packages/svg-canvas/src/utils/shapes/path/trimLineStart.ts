import type { Point } from "../../../types/core/Point";
import { trimLineEnd } from "./trimLineEnd";

/**
 * Trims the start point of a line segment by `trim` along its direction.
 * Implemented by trimming the end of the reversed segment.
 */
export const trimLineStart = (from: Point, to: Point, trim: number): Point => {
	return trimLineEnd(to, from, trim);
};
