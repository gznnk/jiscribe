import type { BoundingBox } from "../types/BoundingBox";
import type { FrameKeyPoints } from "../types/FrameKeyPoints";

/**
 * FrameKeyPoints の4隅から AABB（軸方向バウンディングボックス）を計算する。
 */
export const calcKeyPointsBoundingBox = (kp: FrameKeyPoints): BoundingBox => ({
	left: Math.min(kp.topLeft.x, kp.topRight.x, kp.bottomLeft.x, kp.bottomRight.x),
	right: Math.max(kp.topLeft.x, kp.topRight.x, kp.bottomLeft.x, kp.bottomRight.x),
	top: Math.min(kp.topLeft.y, kp.topRight.y, kp.bottomLeft.y, kp.bottomRight.y),
	bottom: Math.max(kp.topLeft.y, kp.topRight.y, kp.bottomLeft.y, kp.bottomRight.y),
});
