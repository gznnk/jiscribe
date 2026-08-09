import type { Point } from "@jiscribe/geometry";

/**
 * Converts client coordinates to SVG coordinates.
 * @param svg The SVG element
 * @param clientX The client X coordinate
 * @param clientY The client Y coordinate
 * @returns The point in the SVG coordinate system
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
