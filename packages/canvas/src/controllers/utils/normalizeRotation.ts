import { PRECISION } from "@jiscribe/doc/model/precision";
import { normalizeAngleDeg, roundToDecimal } from "@jiscribe/geometry";

/**
 * Normalizes a rotation angle to the 0-360 degree range and rounds it to the configured precision.
 *
 * @param degrees - The angle to normalize (in degrees)
 * @returns The angle normalized to the 0-360 degree range and rounded
 *
 * @example
 * ```typescript
 * normalizeRotation(370.12345);  // 10.123
 * normalizeRotation(-10.5678);   // 349.432
 * normalizeRotation(0);          // 0
 * normalizeRotation(360);        // 0
 * ```
 */
export function normalizeRotation(degrees: number): number {
	const rounded = roundToDecimal(
		normalizeAngleDeg(degrees),
		PRECISION.ROTATION,
	);
	return rounded >= 360 ? 0 : rounded;
}
