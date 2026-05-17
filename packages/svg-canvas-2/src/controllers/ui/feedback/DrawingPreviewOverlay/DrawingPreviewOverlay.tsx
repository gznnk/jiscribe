import { memo } from "react";

import type { CanvasControllerState } from "../../../CanvasTypes";

type DrawingPreviewOverlayProps = {
	shapeDrawing: CanvasControllerState["shapeDrawing"];
};

const FILL = "rgba(120, 120, 120, 0.25)";
const STROKE = "#000000";
const STROKE_WIDTH = 1.5;

const DrawingPreviewOverlayComponent: React.FC<DrawingPreviewOverlayProps> = ({
	shapeDrawing,
}) => {
	if (!shapeDrawing?.preview) {
		return null;
	}

	const { startX, startY, endX, endY } = shapeDrawing.preview;
	const x = Math.min(startX, endX);
	const y = Math.min(startY, endY);
	const width = Math.abs(endX - startX);
	const height = Math.abs(endY - startY);

	const sharedProps = {
		fill: FILL,
		stroke: STROKE,
		strokeWidth: STROKE_WIDTH,
		pointerEvents: "none" as const,
	};

	if (shapeDrawing.preset.objectType === "polyline") {
		return (
			<line
				x1={startX}
				y1={startY}
				x2={endX}
				y2={endY}
				fill="none"
				stroke={STROKE}
				strokeWidth={STROKE_WIDTH}
				pointerEvents="none"
			/>
		);
	}

	if (shapeDrawing.preset.objectType === "ellipse") {
		return (
			<ellipse
				cx={x + width / 2}
				cy={y + height / 2}
				rx={width / 2}
				ry={height / 2}
				{...sharedProps}
			/>
		);
	}

	return <rect x={x} y={y} width={width} height={height} {...sharedProps} />;
};

export const DrawingPreviewOverlay = memo(DrawingPreviewOverlayComponent);
