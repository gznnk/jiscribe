import type { Point } from "../../types/core/Point";

/**
 * Draws a rectangle for debugging purposes.
 * Creates or updates an SVG polygon element to visually represent a rectangle.
 *
 * @param id - Unique identifier for the rectangle element
 * @param p1 - First corner point
 * @param p2 - Second corner point
 * @param p3 - Third corner point
 * @param p4 - Fourth corner point
 * @param color - Color of the rectangle outline (defaults to red)
 */
export const drawRect = (
	id: string,
	p1: Point,
	p2: Point,
	p3: Point,
	p4: Point,
	color = "red",
): void => {
	const svg = document.getElementsByTagName("svg")[0];
	const elm = svg.getElementById(id);
	if (elm) {
		elm.setAttribute(
			"points",
			`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`,
		);
	} else {
		const polygon = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"polygon",
		);
		polygon.setAttribute("id", id);
		polygon.setAttribute(
			"points",
			`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`,
		);
		polygon.setAttribute("stroke", color);
		polygon.setAttribute("fill", "transparent");
		polygon.setAttribute("pointer-events", "none");
		svg.appendChild(polygon);
	}
};
