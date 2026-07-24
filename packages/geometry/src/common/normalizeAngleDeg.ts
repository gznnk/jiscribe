/**
 * 角度を0～360度の範囲に正規化する
 *
 * @param degrees - 正規化する角度（度数）
 * @returns 0～360度の範囲に正規化された角度
 *
 * @example
 * ```typescript
 * normalizeAngleDeg(370); // 10
 * normalizeAngleDeg(-10); // 350
 * normalizeAngleDeg(0);   // 0
 * normalizeAngleDeg(360); // 0
 * ```
 */
export function normalizeAngleDeg(degrees: number): number {
	return ((degrees % 360) + 360) % 360;
}
