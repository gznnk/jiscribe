/**
 * Converts radians to degrees.
 *
 * @param radians - Angle in radians, such as an `angleRad` argument
 * @returns The same angle in degrees, not normalized to [0, 360)
 */
export const radiansToDegrees = (radians: number): number => {
	return radians * (180 / Math.PI);
};
