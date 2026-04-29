import { memo } from "react";

import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";

type DrawingPreviewOverlayProps = {
	activeDrawingTool: ObjectType | null;
	drawingPreview: {
		startX: number;
		startY: number;
		endX: number;
		endY: number;
	} | null;
};

const FILL = "rgba(59, 130, 246, 0.08)";
const STROKE = "#3b82f6";
const STROKE_WIDTH = 1.5;
const STROKE_DASHARRAY = "5, 3";

const DrawingPreviewOverlayComponent: React.FC<DrawingPreviewOverlayProps> = ({
	activeDrawingTool,
	drawingPreview,
}) => {
	if (!activeDrawingTool || !drawingPreview) {
		return null;
	}

	const x = Math.min(drawingPreview.startX, drawingPreview.endX);
	const y = Math.min(drawingPreview.startY, drawingPreview.endY);
	const width = Math.abs(drawingPreview.endX - drawingPreview.startX);
	const height = Math.abs(drawingPreview.endY - drawingPreview.startY);

	const sharedProps = {
		fill: FILL,
		stroke: STROKE,
		strokeWidth: STROKE_WIDTH,
		strokeDasharray: STROKE_DASHARRAY,
		pointerEvents: "none" as const,
	};

	if (activeDrawingTool === "ellipse") {
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
