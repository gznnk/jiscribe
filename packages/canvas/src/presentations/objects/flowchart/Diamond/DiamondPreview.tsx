import { buildDiamondPoints } from "./buildDiamondPoints";
import type { ShapePreviewRenderer } from "../../registry/ShapePreviewTypes";

export const DiamondPreview: ShapePreviewRenderer = ({
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
	// Colors may include var(--jiscribe-*) (the resolved result of auto), so apply them via style rather than SVG attributes.
	return (
		<polygon
			points={buildDiamondPoints(x, y, width, height)}
			style={{ fill, stroke }}
			strokeWidth={strokeWidth}
			pointerEvents="none"
		/>
	);
};
