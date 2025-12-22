import type { EllipseState } from "../../../types/state/shapes/EllipseState";
import { createEllipseState } from "../ellipse/createEllipseState";

/**
 * Converts an SVG Ellipse element to an Ellipse diagram state structure.
 *
 * @param element - The SVG Ellipse element to convert
 * @returns The converted Ellipse diagram state
 */
export const ellipseElementToDiagram = (
	element: SVGEllipseElement,
): EllipseState => {
	const cx = Number(element.getAttribute("cx"));
	const cy = Number(element.getAttribute("cy"));
	const rx = Number(element.getAttribute("rx"));
	const ry = Number(element.getAttribute("ry"));

	if (
		Number.isNaN(cx) ||
		Number.isNaN(cy) ||
		Number.isNaN(rx) ||
		Number.isNaN(ry)
	) {
		throw new Error("Unsupported SVGEllipseElement attribute was found.");
	}

	const strokeWidthAttr = element.getAttribute("stroke-width");
	const strokeWidth = strokeWidthAttr
		? parseFloat(strokeWidthAttr.replace("px", ""))
		: 0;

	return createEllipseState({
		x: cx,
		y: cy,
		width: rx * 2,
		height: ry * 2,
		fill: element.getAttribute("fill") || "transparent",
		stroke: element.getAttribute("stroke") || "transparent",
		strokeWidth: isNaN(strokeWidth) ? 0 : strokeWidth,
	});
};
