/**
 * Converts radians to degrees.
 *
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export const radiansToDegrees = (radians: number): number => {
	return radians * (180 / Math.PI);
};
