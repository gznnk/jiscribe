import type { ShapePreviewRenderer } from "../../registry/ShapePreviewTypes";

/** Preview renderer for an Ellipse shape while it is being drawn. */
export const EllipsePreview: ShapePreviewRenderer = ({
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
	// Colors may contain var(--jiscribe-*) (the resolved result of auto), so apply them via style rather than SVG attributes.
	return (
		<ellipse
			cx={x + width / 2}
			cy={y + height / 2}
			rx={width / 2}
			ry={height / 2}
			style={{ fill, stroke }}
			strokeWidth={strokeWidth}
			pointerEvents="none"
		/>
	);
};
