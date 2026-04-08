/**
 * 角度を0～360度の範囲に正規化する
 *
 * @param degrees - 正規化する角度（度数）
 * @returns 0～360度の範囲に正規化された角度
 *
 * @example
 * ```typescript
 * normalizeAngle(370); // 10
 * normalizeAngle(-10); // 350
 * normalizeAngle(0);   // 0
 * normalizeAngle(360); // 0
 * ```
 */
export function normalizeAngle(degrees: number): number {
	return ((degrees % 360) + 360) % 360;
}
