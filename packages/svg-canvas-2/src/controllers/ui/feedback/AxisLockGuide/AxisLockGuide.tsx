import { memo } from "react";

import type { Viewport } from "../../../../states/canvas/Viewport";
import type { AxisLockFeedback } from "../../../CanvasTypes";

type AxisLockGuideProps = {
	axisLockFeedback: AxisLockFeedback | null;
	viewport: Viewport;
};

// 見た目はスナップガイド（SnapGuides）と揃える
const STROKE = "#3b82f6";
const STROKE_WIDTH = 1;
const STROKE_DASHARRAY = "4, 3";

/**
 * Shift ドラッグの軸固定ガイド線。
 * 移動できる軸方向を示す線を、ビューポート全体に渡って 1 本描画する。
 * - axis="x"（X 固定 / 縦移動）: coordinate を X とする縦線
 * - axis="y"（Y 固定 / 横移動）: coordinate を Y とする横線
 */
const AxisLockGuideComponent: React.FC<AxisLockGuideProps> = ({
	axisLockFeedback,
	viewport,
}) => {
	if (!axisLockFeedback) {
		return null;
	}

	const { minX, minY, width, height, zoom } = viewport;
	// 可視 SVG 範囲（CanvasView の viewBox: minX minY width/zoom height/zoom と一致）
	const left = minX;
	const right = minX + width / zoom;
	const top = minY;
	const bottom = minY + height / zoom;

	const { axis, coordinate } = axisLockFeedback;
	const [x1, y1, x2, y2] =
		axis === "x"
			? [coordinate, top, coordinate, bottom]
			: [left, coordinate, right, coordinate];

	return (
		<line
			data-testid={`axis-lock-guide:${axis}`}
			x1={x1}
			y1={y1}
			x2={x2}
			y2={y2}
			stroke={STROKE}
			strokeWidth={STROKE_WIDTH}
			strokeDasharray={STROKE_DASHARRAY}
			pointerEvents="none"
		/>
	);
};

export const AxisLockGuide = memo(AxisLockGuideComponent);
