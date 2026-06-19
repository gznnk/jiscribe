import type { BoundingBox, TransformedFrame } from "@workspace/geometry";
import {
	calcAffineTransformedPoint,
	calcFrameKeyPoints,
	calcKeyPointsBoundingBox,
} from "@workspace/geometry";

import type { TransformState } from "../../../../../../states/objects/base/TransformState";
import type { TransformAnchorType } from "../TransformAnchorType";

/** アンカーとscaleXからスナップ対象のX辺を返す。反転時はleft/rightを入れ替える。 */
export function getAnchorXSnapEdge(
	anchorType: TransformAnchorType,
	scaleX: number,
): "left" | "right" | null {
	const flipped = scaleX < 0;
	switch (anchorType) {
		case "topRight":
		case "bottomRight":
		case "rightCenter":
			return flipped ? "left" : "right";
		case "topLeft":
		case "bottomLeft":
		case "leftCenter":
			return flipped ? "right" : "left";
		default:
			return null;
	}
}

/** アンカーとscaleYからスナップ対象のY辺を返す。反転時はtop/bottomを入れ替える。 */
export function getAnchorYSnapEdge(
	anchorType: TransformAnchorType,
	scaleY: number,
): "top" | "bottom" | null {
	const flipped = scaleY < 0;
	switch (anchorType) {
		case "topLeft":
		case "topRight":
		case "topCenter":
			return flipped ? "bottom" : "top";
		case "bottomLeft":
		case "bottomRight":
		case "bottomCenter":
			return flipped ? "top" : "bottom";
		default:
			return null;
	}
}

/** 1辺のスナップ量を支配的なカーソル軸で解く。 */
function solveEdgeCursorDelta(
	j: { dx: number; dy: number },
	snapDelta: number,
): { dx: number; dy: number } {
	if (Math.abs(j.dx) >= Math.abs(j.dy)) {
		return { dx: j.dx !== 0 ? snapDelta / j.dx : 0, dy: 0 };
	}
	return { dx: 0, dy: j.dy !== 0 ? snapDelta / j.dy : 0 };
}

/**
 * AABBエッジのスナップ量からカーソル補正量を逆算する。
 * xEdge/yEdge が両方ある場合は2x2線形系を解き、行列式が小さい場合は感度の高い辺のみ解く。
 */
export function calcSnapCursorDelta(
	J: Record<"left" | "right" | "top" | "bottom", { dx: number; dy: number }>,
	xEdge: "left" | "right" | null,
	yEdge: "top" | "bottom" | null,
	snapAabbDx: number,
	snapAabbDy: number,
): { dx: number; dy: number } {
	if (
		xEdge !== null &&
		yEdge !== null &&
		snapAabbDx !== 0 &&
		snapAabbDy !== 0
	) {
		const a = J[xEdge].dx,
			b = J[xEdge].dy;
		const c = J[yEdge].dx,
			d = J[yEdge].dy;
		const det = a * d - b * c;
		if (Math.abs(det) > 0.09) {
			return {
				dx: (snapAabbDx * d - snapAabbDy * b) / det,
				dy: (snapAabbDy * a - snapAabbDx * c) / det,
			};
		}
		// 行列式が小さい→感度の高い辺のみ
		const xSens = Math.max(Math.abs(a), Math.abs(b));
		const ySens = Math.max(Math.abs(c), Math.abs(d));
		if (xSens >= ySens) {
			return solveEdgeCursorDelta(J[xEdge], snapAabbDx);
		}
		return solveEdgeCursorDelta(J[yEdge], snapAabbDy);
	}
	if (xEdge !== null && snapAabbDx !== 0) {
		return solveEdgeCursorDelta(J[xEdge], snapAabbDx);
	}
	if (yEdge !== null && snapAabbDy !== 0) {
		return solveEdgeCursorDelta(J[yEdge], snapAabbDy);
	}
	return { dx: 0, dy: 0 };
}

/** リサイズ仮結果から変換後の AABB を計算する。 */
export function calcTentativeBBox(
	resizeResult: {
		width: number;
		height: number;
		inversedCenterX: number;
		inversedCenterY: number;
	},
	startFrame: TransformedFrame & TransformState,
	radians: number,
): BoundingBox {
	const newCenter = calcAffineTransformedPoint(
		resizeResult.inversedCenterX,
		resizeResult.inversedCenterY,
		1,
		1,
		radians,
		startFrame.cx,
		startFrame.cy,
	);
	const kp = calcFrameKeyPoints({
		...startFrame,
		cx: newCenter.x,
		cy: newCenter.y,
		width: Math.abs(resizeResult.width),
		height: Math.abs(resizeResult.height),
	});
	return calcKeyPointsBoundingBox(kp);
}
