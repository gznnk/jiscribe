import type { RectangleState } from "../../../types/state/shapes/RectangleState";
import { createRectangleState } from "../rectangle/createRectangleState";

/**
 * Converts an SVG Rectangle element to a Rectangle diagram state structure.
 *
 * @param element - The SVG Rectangle element to convert
 * @returns The converted Rectangle diagram state
 */
export const rectElementToDiagram = (
	element: SVGRectElement,
): RectangleState => {
	const x = Number(element.getAttribute("x"));
	const y = Number(element.getAttribute("y"));
	const width = Number(element.getAttribute("width"));
	const height = Number(element.getAttribute("height"));

	if (
		Number.isNaN(x) ||
		Number.isNaN(y) ||
		Number.isNaN(width) ||
		Number.isNaN(height)
	) {
		throw new Error("Unsupported SVGRectElement attribute was found.");
	}

	const strokeWidthAttr = element.getAttribute("stroke-width");
	const strokeWidth = strokeWidthAttr
		? parseFloat(strokeWidthAttr.replace("px", ""))
		: 0;

	return createRectangleState({
		x: x + width / 2,
		y: y + height / 2,
		width,
		height,
		fill: element.getAttribute("fill") || "transparent",
		stroke: element.getAttribute("stroke") || "transparent",
		strokeWidth: isNaN(strokeWidth) ? 0 : strokeWidth,
	});
};
