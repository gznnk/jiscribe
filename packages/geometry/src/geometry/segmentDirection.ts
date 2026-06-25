import type { OrthogonalDirection } from "../types/OrthogonalDirection";
import type { Point } from "../types/Point";

/**
 * 直交セグメント `a → b` の向きを返す。
 * `snapToDirection` と違い、**厳密に軸並行**な場合のみ方向を返し、
 * 斜め・長さ 0 は `null`（どちらの軸とも言えないため）。
 */
export const segmentDirection = (
	a: Point,
	b: Point,
): OrthogonalDirection | null => {
	if (a.x === b.x && a.y !== b.y) {
		return b.y < a.y ? "up" : "down";
	}
	if (a.y === b.y && a.x !== b.x) {
		return b.x < a.x ? "left" : "right";
	}
	return null;
};
