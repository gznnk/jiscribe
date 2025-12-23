import type { Direction } from "../../../types/core/Direction";
import { radiansToDegrees } from "../../math/common/radiansToDegrees";

/**
 * Converts radians to direction based on angle degrees.
 *
 * @param radians - The angle in radians
 * @returns The direction corresponding to the angle
 */
export const getDirection = (radians: number): Direction => {
	const degrees = (Math.round(radiansToDegrees(radians)) + 360) % 360;
	if (degrees <= 45 || 315 <= degrees) {
		return "right";
	}
	if (45 < degrees && degrees < 135) {
		return "down";
	}
	if (135 <= degrees && degrees <= 225) {
		return "left";
	}
	return "up";
};
