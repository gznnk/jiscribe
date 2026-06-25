import type { OrthogonalDirection } from "../types/OrthogonalDirection";

/**
 * ベクトル `(dx, dy)` を最も近い軸方向へスナップする。
 * 優勢な軸（絶対値が大きい方）を採用し、同値なら水平を優先する。
 * 斜めや 0 ベクトルでも必ずいずれかの方向を返す。
 */
export const snapToDirection = (
	dx: number,
	dy: number,
): OrthogonalDirection => {
	if (Math.abs(dx) >= Math.abs(dy)) {
		return dx >= 0 ? "right" : "left";
	}
	return dy >= 0 ? "down" : "up";
};
