import type { Point } from "../../types/core/Point";

/**
 * Get the SVG point from the client coordinates.
 * Converts browser viewport coordinates to SVG coordinate system.
 *
 * @param clientX - The X position of the cursor relative to the viewport (not the whole page).
 * @param clientY - The Y position of the cursor relative to the viewport (not the whole page).
 * @param svgElement - The SVG element reference to get coordinate transformation
 * @returns The SVG point in the SVG coordinate system
 * @throws Error when the SVG element is null
 */
export const getSvgPoint = (
	clientX: number,
	clientY: number,
	svgElement: SVGElement | null,
): Point => {
	const ownerSVGElement = svgElement?.ownerSVGElement;
	if (ownerSVGElement === null || ownerSVGElement === undefined) {
		throw new Error("ownerSVGElement is null.");
	}

	const point = ownerSVGElement.createSVGPoint();
	point.x = clientX;
	point.y = clientY;

	const ctm = ownerSVGElement.getScreenCTM();
	if (ctm === null) {
		throw new Error("getScreenCTM() returned null.");
	}

	return point.matrixTransform(ctm.inverse());
};
