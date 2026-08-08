/**
 * Normalizes an angle in degrees into the [0, 360) range.
 * `370 -> 10`, `-10 -> 350`, `360 -> 0`.
 *
 * @param degrees - Angle in degrees, of any magnitude and either sign
 * @returns The equivalent angle within [0, 360)
 */
export function normalizeAngleDeg(degrees: number): number {
	return ((degrees % 360) + 360) % 360;
}
