/**
 * Converts degrees to radians.
 *
 * @param degrees - Angle in degrees, such as `Transform.rotation`
 * @returns The same angle in radians
 */
export const degreesToRadians = (degrees: number): number => {
	return degrees * (Math.PI / 180);
};
