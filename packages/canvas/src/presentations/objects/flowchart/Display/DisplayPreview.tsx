import { buildDisplayPath } from "./buildDisplayPath";
import type { ShapePreviewRenderer } from "../../registry/ShapePreviewTypes";

/** Preview renderer for a Display shape while it is being drawn. */
export const DisplayPreview: ShapePreviewRenderer = ({
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
		<path
			d={buildDisplayPath(x, y, width, height)}
			style={{ fill, stroke }}
			strokeWidth={strokeWidth}
			pointerEvents="none"
		/>
	);
};
