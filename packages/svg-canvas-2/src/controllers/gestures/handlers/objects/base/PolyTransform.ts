import type { Point } from "@workspace/geometry";
import {
	calcRotatedPoint,
	degreesToRadians,
	roundToDecimal,
} from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { PolygonState } from "../../../../../states/objects/primitives/polygon/PolygonState";
import type { PolylineState } from "../../../../../states/objects/primitives/polyline/PolylineState";

/**
 * Poly系（Polygon, Polyline）のグループ変形処理
 * 各頂点をグループの変形に合わせて変換する
 */
export function transformPolyByGroup<T extends PolygonState | PolylineState>(
	poly: T,
	transformRootGroupStartState: GroupState,
	transformRootGroupEndState: GroupState,
): T {
	const groupScaleX =
		transformRootGroupEndState.width / transformRootGroupStartState.width;
	const groupScaleY =
		transformRootGroupEndState.height / transformRootGroupStartState.height;

	// 各頂点を変換
	const transformedPoints = poly.points.map((point) => {
		// 1. グループの回転を解除（ローカル座標系に変換）
		const inversedPoint = calcRotatedPoint(
			point.x,
			point.y,
			transformRootGroupStartState.cx,
			transformRootGroupStartState.cy,
			degreesToRadians(-transformRootGroupStartState.rotation),
		);

		// 2. グループ内部のローカル座標系でオフセットを計算し、スケールを適用
		const localOffsetX =
			(inversedPoint.x - transformRootGroupStartState.cx) *
			transformRootGroupStartState.scaleX *
			transformRootGroupEndState.scaleX;
		const localOffsetY =
			(inversedPoint.y - transformRootGroupStartState.cy) *
			transformRootGroupStartState.scaleY *
			transformRootGroupEndState.scaleY;

		// 3. グループのスケール変化を適用
		const dx = localOffsetX * groupScaleX;
		const dy = localOffsetY * groupScaleY;

		// 4. 新しいグループの回転を適用（絶対座標系に戻す）
		const newPoint = calcRotatedPoint(
			transformRootGroupEndState.cx + dx,
			transformRootGroupEndState.cy + dy,
			transformRootGroupEndState.cx,
			transformRootGroupEndState.cy,
			degreesToRadians(transformRootGroupEndState.rotation),
		);

		return {
			x: roundToDecimal(newPoint.x, PRECISION.COORDINATE),
			y: roundToDecimal(newPoint.y, PRECISION.COORDINATE),
		} as Point;
	});

	return {
		...poly,
		points: transformedPoints,
	};
}

/**
 * Poly系（Polygon, Polyline）のグループ回転処理
 * 各頂点をグループの中心を基準に回転する
 *
 * @param poly - 回転対象のPoly
 * @param rotationRootGroup - 回転の基準となるグループの状態
 * @param endGroupRotation - グループの最終的な回転角度
 * @returns 回転後のPoly
 */
export function rotatePolyByGroup<T extends PolygonState | PolylineState>(
	poly: T,
	rotationRootGroup: GroupState,
	endGroupRotation: number,
): T {
	const rotationDelta = endGroupRotation - rotationRootGroup.rotation;

	// 各頂点を回転中心を基準に回転
	const rotatedPoints = poly.points.map((point) => {
		const rotatedPoint = calcRotatedPoint(
			point.x,
			point.y,
			rotationRootGroup.cx,
			rotationRootGroup.cy,
			degreesToRadians(rotationDelta),
		);

		return {
			x: roundToDecimal(rotatedPoint.x, PRECISION.COORDINATE),
			y: roundToDecimal(rotatedPoint.y, PRECISION.COORDINATE),
		} as Point;
	});

	return {
		...poly,
		points: rotatedPoints,
	};
}
