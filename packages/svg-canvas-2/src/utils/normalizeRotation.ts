import { normalizeAngle, roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../constants/precision";

/**
 * 回転角度を0～360度の範囲に正規化し、指定された精度で丸める
 *
 * @param degrees - 正規化する角度（度数）
 * @returns 0～360度の範囲に正規化され、丸められた角度
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
	return roundToDecimal(normalizeAngle(degrees), PRECISION.ROTATION);
}
