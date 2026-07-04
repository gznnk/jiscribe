import type { BoundingBox, TransformedFrame } from "@workspace/geometry";
import {
	calcAffineTransformedPoint,
	calcBoundingBox,
} from "@workspace/geometry";

import type { TransformState } from "../../../../../../states/objects/base/TransformState";
import type { TransformAnchorType } from "../TransformAnchorType";

/** Returns the X edge to snap against from the anchor and scaleX. When flipped, left/right are swapped. */
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

/** Returns the Y edge to snap against from the anchor and scaleY. When flipped, top/bottom are swapped. */
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

/** Solves the snap amount for a single edge along the dominant cursor axis. */
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
 * Back-computes the cursor correction from the AABB edge snap amounts.
 * When both xEdge and yEdge are present, solves the 2x2 linear system; when the
 * determinant is small, solves only the more sensitive edge.
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
		// Small determinant -> use only the more sensitive edge
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

/** Computes the transformed AABB from a tentative resize result. */
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
	return calcBoundingBox({
		...startFrame,
		cx: newCenter.x,
		cy: newCenter.y,
		width: Math.abs(resizeResult.width),
		height: Math.abs(resizeResult.height),
	});
}
