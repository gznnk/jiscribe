import type { EllipseState } from "../../../types/state/shapes/EllipseState";
import { createEllipseState } from "../ellipse/createEllipseState";

/**
 * Converts an SVG Circle element to an Ellipse diagram state structure.
 *
 * @param element - The SVG Circle element to convert
 * @returns The converted Ellipse diagram state
 */
export const circleElementToDiagram = (
	element: SVGCircleElement,
): EllipseState => {
	const cx = Number(element.getAttribute("cx"));
	const cy = Number(element.getAttribute("cy"));
	const r = Number(element.getAttribute("r"));

	if (Number.isNaN(cx) || Number.isNaN(cy) || Number.isNaN(r)) {
		throw new Error("Unsupported SVGCircleElement attribute was found.");
	}

	const strokeWidthAttr = element.getAttribute("stroke-width");
	const strokeWidth = strokeWidthAttr
		? parseFloat(strokeWidthAttr.replace("px", ""))
		: 0;

	return createEllipseState({
		x: cx,
		y: cy,
		width: r * 2,
		height: r * 2,
		fill: element.getAttribute("fill") || "transparent",
		stroke: element.getAttribute("stroke") || "transparent",
		strokeWidth: isNaN(strokeWidth) ? 0 : strokeWidth,
	});
};
