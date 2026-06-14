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
 * 移動できる軸方向を示す線を、ビューポート全体に渡って描画する。
 * - x（縦線）: X 固定（縦移動）時に表示
 * - y（横線）: Y 固定（横移動）時に表示
 * - 原点スナップ中は x・y の両方が入り、十字に表示される
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

	const { x, y } = axisLockFeedback;

	return (
		<>
			{x !== undefined && (
				<line
					data-testid="axis-lock-guide:x"
					x1={x}
					y1={top}
					x2={x}
					y2={bottom}
					stroke={STROKE}
					strokeWidth={STROKE_WIDTH}
					strokeDasharray={STROKE_DASHARRAY}
					pointerEvents="none"
				/>
			)}
			{y !== undefined && (
				<line
					data-testid="axis-lock-guide:y"
					x1={left}
					y1={y}
					x2={right}
					y2={y}
					stroke={STROKE}
					strokeWidth={STROKE_WIDTH}
					strokeDasharray={STROKE_DASHARRAY}
					pointerEvents="none"
				/>
			)}
		</>
	);
};

export const AxisLockGuide = memo(AxisLockGuideComponent);
