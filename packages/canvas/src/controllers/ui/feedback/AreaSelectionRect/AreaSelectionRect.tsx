import { memo } from "react";

import type { DragRect } from "../../../CanvasTypes";

type AreaSelectionRectProps = {
	/** The marquee being dragged; null when none is */
	rect: DragRect | null;
};

const FILL = "rgba(107, 114, 128, 0.06)";
const STROKE = "#6b7280";
const STROKE_WIDTH = 1.5;
const STROKE_DASHARRAY = "5, 3";
const BORDER_RADIUS = 2;

const AreaSelectionRectComponent: React.FC<AreaSelectionRectProps> = ({
	rect,
}) => {
	if (!rect) {
		return null;
	}

	const x = Math.min(rect.startX, rect.endX);
	const y = Math.min(rect.startY, rect.endY);
	const width = Math.abs(rect.endX - rect.startX);
	const height = Math.abs(rect.endY - rect.startY);

	return (
		<rect
			data-testid="area-selection-rect"
			x={x}
			y={y}
			width={width}
			height={height}
			fill={FILL}
			stroke={STROKE}
			strokeWidth={STROKE_WIDTH}
			strokeDasharray={STROKE_DASHARRAY}
			rx={BORDER_RADIUS}
			ry={BORDER_RADIUS}
			pointerEvents="none"
		/>
	);
};

export const AreaSelectionRect = memo(AreaSelectionRectComponent);
