import type { Point } from "@workspace/geometry";

/**
 * クライアント座標をSVG座標に変換する
 * @param svg SVG要素
 * @param clientX クライアントX座標
 * @param clientY クライアントY座標
 * @returns SVG座標系でのポイント
 */
export const getSvgPoint = (
	svg: SVGSVGElement | null,
	clientX: number,
	clientY: number,
): Point => {
	if (!svg) {
		// Fallback to client coordinates if SVG ref is not available
		return { x: clientX, y: clientY };
	}

	const point = svg.createSVGPoint();
	point.x = clientX;
	point.y = clientY;

	const ctm = svg.getScreenCTM();
	if (!ctm) {
		// Fallback to client coordinates if CTM is not available
		return { x: clientX, y: clientY };
	}

	const svgPoint = point.matrixTransform(ctm.inverse());
	return { x: svgPoint.x, y: svgPoint.y };
};
