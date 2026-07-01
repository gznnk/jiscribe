import type { BoundingBox, Point } from "../types";

/**
 * Poly系オブジェクトの points 配列からバウンディングボックスを計算する。
 *
 * @param points - 点の配列
 * @returns バウンディングボックス、または空配列の場合は null
 */
export function calcPolyBoundingBox(
	points: readonly Point[],
): BoundingBox | null {
	if (points.length === 0) {
		return null;
	}

	let minX = points[0].x;
	let maxX = points[0].x;
	let minY = points[0].y;
	let maxY = points[0].y;

	for (let i = 1; i < points.length; i++) {
		const { x, y } = points[i];
		if (x < minX) {
			minX = x;
		}
		if (x > maxX) {
			maxX = x;
		}
		if (y < minY) {
			minY = y;
		}
		if (y > maxY) {
			maxY = y;
		}
	}

	return { left: minX, top: minY, right: maxX, bottom: maxY };
}
