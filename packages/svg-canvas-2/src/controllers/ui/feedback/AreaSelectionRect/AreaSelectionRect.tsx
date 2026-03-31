import { memo } from "react";

type AreaSelectionRectProps = {
	areaSelection: {
		startX: number;
		startY: number;
		endX: number;
		endY: number;
	} | null;
};

const FILL = "rgba(107, 114, 128, 0.06)";
const STROKE = "#6b7280";
const STROKE_WIDTH = 1.5;
const STROKE_DASHARRAY = "5, 3";
const BORDER_RADIUS = 2;

const AreaSelectionRectComponent: React.FC<AreaSelectionRectProps> = ({
	areaSelection,
}) => {
	if (!areaSelection) {
		return null;
	}

	const x = Math.min(areaSelection.startX, areaSelection.endX);
	const y = Math.min(areaSelection.startY, areaSelection.endY);
	const width = Math.abs(areaSelection.endX - areaSelection.startX);
	const height = Math.abs(areaSelection.endY - areaSelection.startY);

	return (
		<rect
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
