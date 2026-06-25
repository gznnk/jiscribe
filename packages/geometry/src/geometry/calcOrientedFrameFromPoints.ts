import { calcPolyBoundingBox } from "./calcPolyBoundingBox";
import { degreesToRadians } from "../common/degreesToRadians";
import { nanToZero } from "../common/nanToZero";
import { applyAffineWithTrig } from "../transform/applyAffineWithTrig";
import { applyInverseAffineWithTrig } from "../transform/applyInverseAffineWithTrig";
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
 * @param scaleX - X軸のスケール (デフォルト: 1)
 * @param scaleY - Y軸のスケール (デフォルト: 1)
 * @param rotation - 回転角度（度数法、デフォルト: 0）
 * @returns 点群を包含する TransformedFrame。points が空の場合は null
 */
export const calcOrientedFrameFromPoints = (
	points: Point[],
	scaleX = 1,
	scaleY = 1,
	rotation = 0,
): TransformedFrame | null => {
	if (points.length === 0) {
		return null;
	}

	// points は空でないため calcPolyBoundingBox は必ず非 null を返す
	const { left, top, right, bottom } = calcPolyBoundingBox(points)!;

	const x = nanToZero((left + right) / 2);
	const y = nanToZero((top + bottom) / 2);

	const radians = degreesToRadians(rotation);
	const cosTheta = Math.cos(radians);
	const sinTheta = Math.sin(radians);

	const inversePoints = points.map((p) =>
		applyInverseAffineWithTrig(
			p.x,
			p.y,
			scaleX,
			scaleY,
			cosTheta,
			sinTheta,
			x,
			y,
		),
	);

	const {
		left: inverseLeft,
		top: inverseTop,
		right: inverseRight,
		bottom: inverseBottom,
	} = calcPolyBoundingBox(inversePoints)!;

	const width = inverseRight - inverseLeft;
	const height = inverseBottom - inverseTop;

	const inverseCenterX = (inverseLeft + inverseRight) / 2;
	const inverseCenterY = (inverseTop + inverseBottom) / 2;

	const centerPoint = applyAffineWithTrig(
		inverseCenterX,
		inverseCenterY,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		x,
		y,
	);

	return {
		cx: centerPoint.x,
		cy: centerPoint.y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	};
};
