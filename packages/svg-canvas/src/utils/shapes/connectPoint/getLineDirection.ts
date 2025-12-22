import { getDirection } from "./getDirection";
import type { Direction } from "../../../types/core/Direction";
import { calcRadians } from "../../math/points/calcRadians";

/**
 * Gets direction from two points coordinates.
 *
 * @param ox - Origin x coordinate
 * @param oy - Origin y coordinate
 * @param px - Point x coordinate
 * @param py - Point y coordinate
 * @returns Direction from origin to point
 */
export const getLineDirection = (
	ox: number,
	oy: number,
	px: number,
	py: number,
): Direction => {
	return getDirection(calcRadians(ox, oy, px, py));
};
