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

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const point of points) {
		minX = Math.min(minX, point.x);
		maxX = Math.max(maxX, point.x);
		minY = Math.min(minY, point.y);
		maxY = Math.max(maxY, point.y);
	}

	return { left: minX, top: minY, right: maxX, bottom: maxY };
}
