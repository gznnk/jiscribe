import type { ShapePreviewRenderer } from "../../registry/ShapePreviewTypes";

// Same vertex count as PolygonShapeFactory. Previews a regular polygon inscribed in the bounds.
const POLYGON_SIDES = 5;

export const PolygonPreview: ShapePreviewRenderer = ({
	startX,
	startY,
	endX,
	endY,
	stroke,
	fill,
	strokeWidth,
}) => {
	const cx = (startX + endX) / 2;
	const cy = (startY + endY) / 2;
	const rx = Math.abs(endX - startX) / 2;
	const ry = Math.abs(endY - startY) / 2;

	const pointsAttr = Array.from({ length: POLYGON_SIDES }, (_, i) => {
		const angle = (2 * Math.PI * i) / POLYGON_SIDES - Math.PI / 2;
		return `${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`;
	}).join(" ");

	// Colors may contain var(--vscode-*) (the result of resolving auto), so apply them via style rather than SVG attributes.
	return (
		<polygon
			points={pointsAttr}
			style={{ fill, stroke }}
			strokeWidth={strokeWidth}
			pointerEvents="none"
		/>
	);
};
