import { PathDefaultState } from "../../../constants/state/shapes/PathDefaultState";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";
import type { PathState } from "../../../types/state/shapes/PathState";
import { newId } from "../common/newId";

/**
 * Converts an SVG Line element to a Path diagram state structure.
 *
 * @param element - The SVG Line element to convert
 * @returns The converted Path diagram state
 */
export const lineElementToDiagram = (element: SVGLineElement): PathState => {
	const x1 = Number(element.getAttribute("x1"));
	const y1 = Number(element.getAttribute("y1"));
	const x2 = Number(element.getAttribute("x2"));
	const y2 = Number(element.getAttribute("y2"));

	if (
		Number.isNaN(x1) ||
		Number.isNaN(y1) ||
		Number.isNaN(x2) ||
		Number.isNaN(y2)
	) {
		throw new Error("Unsupported SVGLineElement attribute was found.");
	}

	const strokeWidthAttr = element.getAttribute("stroke-width");
	const strokeWidth = strokeWidthAttr
		? parseFloat(strokeWidthAttr.replace("px", ""))
		: 0;

	return {
		...PathDefaultState,
		id: newId(),
		type: "Path",
		x: (x1 + x2) / 2,
		y: (y1 + y2) / 2,
		width: Math.abs(x2 - x1),
		height: Math.abs(y2 - y1),
		stroke: element.getAttribute("stroke") || "transparent",
		strokeWidth: isNaN(strokeWidth) ? 0 : strokeWidth,
		items: [
			{
				id: newId(),
				type: "PathPoint",
				x: x1,
				y: y1,
			},
			{
				id: newId(),
				type: "PathPoint",
				x: x2,
				y: y2,
			},
		] as PathPointState[],
	} as PathState;
};
