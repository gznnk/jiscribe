import type { ShapePreviewRenderer } from "../../registry/ShapePreviewTypes";

// PolygonShapeFactory と同じ頂点数。bounds から正多角形を内接させてプレビューする。
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

	// 色は var(--vscode-*)（auto の解決結果）を含みうるため SVG 属性ではなく style で当てる。
	return (
		<polygon
			points={pointsAttr}
			style={{ fill, stroke }}
			strokeWidth={strokeWidth}
			pointerEvents="none"
		/>
	);
};
