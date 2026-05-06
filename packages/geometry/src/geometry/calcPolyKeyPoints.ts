import { calcPolyBoundingBox } from "./calcPolyBoundingBox";
import type { FrameKeyPoints } from "../types/FrameKeyPoints";
import type { Point } from "../types/Point";

/**
 * Poly系オブジェクトの points 配列から FrameKeyPoints を計算する。
 *
 * @param points - 点の配列
 * @returns FrameKeyPoints、または空配列の場合は null
 */
export function calcPolyKeyPoints(points: readonly Point[]): FrameKeyPoints | null {
	const bbox = calcPolyBoundingBox(points);
	if (!bbox) return null;

	const midX = (bbox.left + bbox.right) / 2;
	const midY = (bbox.top + bbox.bottom) / 2;

	return {
		topLeft:      { x: bbox.left,  y: bbox.top    },
		topCenter:    { x: midX,        y: bbox.top    },
		topRight:     { x: bbox.right,  y: bbox.top    },
		rightCenter:  { x: bbox.right,  y: midY        },
		bottomRight:  { x: bbox.right,  y: bbox.bottom },
		bottomCenter: { x: midX,        y: bbox.bottom },
		bottomLeft:   { x: bbox.left,   y: bbox.bottom },
		leftCenter:   { x: bbox.left,   y: midY        },
	};
}
