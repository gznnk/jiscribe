import type { ShapePreviewRenderer } from "../../registry/ShapePreviewTypes";

export const PolylinePreview: ShapePreviewRenderer = ({
	startX,
	startY,
	endX,
	endY,
	stroke,
	strokeWidth,
}) => (
	// polyline は塗りなし・線のみ。
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
