import type { ShapePreviewRenderer } from "../../registry/ShapePreviewTypes";

/** Preview renderer for a Polyline shape while it is being drawn. */
export const PolylinePreview: ShapePreviewRenderer = ({
	startX,
	startY,
	endX,
	endY,
	stroke,
	strokeWidth,
}) => (
	// A polyline has no fill, only a line.
	<line
		x1={startX}
		y1={startY}
		x2={endX}
		y2={endY}
		fill="none"
		style={{ stroke }}
		strokeWidth={strokeWidth}
		pointerEvents="none"
	/>
);
