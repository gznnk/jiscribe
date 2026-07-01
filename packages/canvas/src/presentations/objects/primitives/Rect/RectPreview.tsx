import type { ShapePreviewRenderer } from "../../registry/ShapePreviewTypes";

/** Preview renderer for a Rect shape while it is being drawn. */
export const RectPreview: ShapePreviewRenderer = ({
	startX,
	startY,
	endX,
	endY,
	stroke,
	fill,
	strokeWidth,
}) => {
	const x = Math.min(startX, endX);
	const y = Math.min(startY, endY);
	const width = Math.abs(endX - startX);
	const height = Math.abs(endY - startY);
	// Colors may contain var(--vscode-*) (the resolved result of auto), so apply them via style rather than SVG attributes.
	return (
		<rect
			x={x}
			y={y}
			width={width}
			height={height}
			style={{ fill, stroke }}
			strokeWidth={strokeWidth}
			pointerEvents="none"
		/>
	);
};
