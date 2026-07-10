import { memo } from "react";

import { theme } from "../../../../constants/theme";
import type { Viewport } from "../../../../states/canvas/Viewport";
import type { AxisLockFeedback } from "../../../CanvasTypes";

type AxisLockGuideProps = {
	axisLockFeedback: AxisLockFeedback | null;
	viewport: Viewport;
};

// Match the appearance of the snap guides (SnapGuides)
const STROKE_WIDTH = 1;
const STROKE_DASHARRAY = "4, 3";

/**
 * Axis-lock guide lines for Shift drag.
 * Draws lines across the whole viewport indicating the axis along which
 * movement is allowed.
 * - x (vertical line): shown when locked to X (vertical movement)
 * - y (horizontal line): shown when locked to Y (horizontal movement)
 * - while snapping to the origin, both x and y are present, forming a cross
 */
const AxisLockGuideComponent: React.FC<AxisLockGuideProps> = ({
	axisLockFeedback,
	viewport,
}) => {
	if (!axisLockFeedback) {
		return null;
	}

	const { minX, minY, width, height, zoom } = viewport;
	// Visible SVG range (matches CanvasView's viewBox: minX minY width/zoom height/zoom)
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
					strokeWidth={STROKE_WIDTH}
					strokeDasharray={STROKE_DASHARRAY}
					pointerEvents="none"
					// The color may hold var(--jiscribe-*), so it is applied via style.
					style={{ stroke: theme.handleAccent }}
				/>
			)}
			{y !== undefined && (
				<line
					data-testid="axis-lock-guide:y"
					x1={left}
					y1={y}
					x2={right}
					y2={y}
					strokeWidth={STROKE_WIDTH}
					strokeDasharray={STROKE_DASHARRAY}
					pointerEvents="none"
					// The color may hold var(--jiscribe-*), so it is applied via style.
					style={{ stroke: theme.handleAccent }}
				/>
			)}
		</>
	);
};

export const AxisLockGuide = memo(AxisLockGuideComponent);
