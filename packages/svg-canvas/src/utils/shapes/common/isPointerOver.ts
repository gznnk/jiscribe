import type React from "react";

/**
 * Check if a pointer position is over an SVG element.
 * This function converts client coordinates to SVG coordinates and tests
 * if the point intersects with the SVG element's fill or stroke.
 *
 * @param ref - React ref to the SVG element to test
 * @param clientX - The X position of the cursor relative to the viewport
 * @param clientY - The Y position of the cursor relative to the viewport
 * @returns true if the pointer is over the element, false otherwise
 */
export const isPointerOver = (
	ref: React.RefObject<SVGElement>,
	clientX: number,
	clientY: number,
): boolean => {
	const svgCanvas = ref.current?.ownerSVGElement as SVGSVGElement;
	if (!svgCanvas) {
		return false;
	}
	const svgPoint = svgCanvas.createSVGPoint();

	if (svgPoint) {
		svgPoint.x = clientX;
		svgPoint.y = clientY;
		const svg = ref.current;

		if (svg instanceof SVGGeometryElement) {
			const transformedPoint = svgPoint.matrixTransform(
				svg.getScreenCTM()?.inverse(),
			);
			return (
				svg.isPointInFill(transformedPoint) ||
				svg.isPointInStroke(transformedPoint)
			);
		}
	}
	return false;
};
