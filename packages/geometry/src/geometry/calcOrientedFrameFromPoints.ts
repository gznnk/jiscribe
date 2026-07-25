import { calcPolyBoundingBox } from "./calcPolyBoundingBox";
import { degreesToRadians } from "../common/degreesToRadians";
import { nanToZero } from "../common/nanToZero";
import { applyAffineWithTrig } from "../transform/applyAffineWithTrig";
import type { FlipScale } from "../types/FlipScale";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * 点群から指定された transform を持つ TransformedFrame を計算します。
 *
 * このアルゴリズムは以下の手順で動作します:
 * 1. 点群の軸平行バウンディングボックス (AABB) の中心を計算
 * 2. その中心を基準に、指定された transform の**逆変換**を全点に適用
 * 3. 逆変換後の点群の AABB を計算し、width/height を取得
 * 4. 逆変換後の中心を順変換して最終的な中心位置を計算
 *
 * @param points - フレームを計算する点の配列
 * @param scaleX - X軸の反転フラグ（±1、デフォルト: 1）
 * @param scaleY - Y軸の反転フラグ（±1、デフォルト: 1）
 * @param rotationDeg - 回転角度（度数法、デフォルト: 0）
 * @returns 点群を包含する TransformedFrame。points が空の場合は null
 */
export const calcOrientedFrameFromPoints = (
	points: Point[],
	scaleX: FlipScale = 1,
	scaleY: FlipScale = 1,
	rotationDeg = 0,
): TransformedFrame | null => {
	if (points.length === 0) {
		return null;
	}

	// points は空でないため calcPolyBoundingBox は必ず非 null を返す
	const { left, top, right, bottom } = calcPolyBoundingBox(points)!;

	const x = nanToZero((left + right) / 2);
	const y = nanToZero((top + bottom) / 2);

	const radians = degreesToRadians(rotationDeg);
	const cosAngle = Math.cos(radians);
	const sinAngle = Math.sin(radians);

	// 逆変換後の点群の AABB を、中間配列や Point を確保せずワンパスで求める。
	// 各点の変換式は applyInverseAffineWithTrig と同一（ホットパスのためインライン展開）。
	let inverseLeft = Infinity;
	let inverseTop = Infinity;
	let inverseRight = -Infinity;
	let inverseBottom = -Infinity;
	for (const p of points) {
		const translatedX = p.x - x;
		const translatedY = p.y - y;
		const ix = (cosAngle * translatedX + sinAngle * translatedY) / scaleX;
		const iy = (-sinAngle * translatedX + cosAngle * translatedY) / scaleY;
		if (ix < inverseLeft) {
			inverseLeft = ix;
		}
		if (ix > inverseRight) {
			inverseRight = ix;
		}
		if (iy < inverseTop) {
			inverseTop = iy;
		}
		if (iy > inverseBottom) {
			inverseBottom = iy;
		}
	}

	const width = inverseRight - inverseLeft;
	const height = inverseBottom - inverseTop;

	const inverseCenterX = (inverseLeft + inverseRight) / 2;
	const inverseCenterY = (inverseTop + inverseBottom) / 2;

	const centerPoint = applyAffineWithTrig(
		inverseCenterX,
		inverseCenterY,
		scaleX,
		scaleY,
		cosAngle,
		sinAngle,
		x,
		y,
	);

	return {
		cx: centerPoint.x,
		cy: centerPoint.y,
		width,
		height,
		rotation: rotationDeg,
		scaleX,
		scaleY,
	};
};
