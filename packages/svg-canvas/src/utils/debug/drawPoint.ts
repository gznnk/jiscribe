import type { Point } from "../../types/core/Point";

/**
 * Draws a point for debugging purposes.
 * Creates or updates an SVG circle element to visually represent a point.
 *
 * @param id - Unique identifier for the point element
 * @param point - Coordinates of the point to draw
 * @param color - Color of the point (defaults to red)
 */
export const drawPoint = (id: string, point: Point, color = "red"): void => {
	const svg = document.getElementsByTagName("svg")[0];
	if (!svg) return;
	const elm = svg.getElementById(id);
	if (elm) {
		elm.setAttribute("cx", point.x.toString());
		elm.setAttribute("cy", point.y.toString());
	} else {
		const circle = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"circle",
		);
		circle.setAttribute("id", id);
		circle.setAttribute("cx", point.x.toString());
		circle.setAttribute("cy", point.y.toString());
		circle.setAttribute("r", "5");
		circle.setAttribute("fill", color);
		circle.setAttribute("pointer-events", "none");
		svg.appendChild(circle);
	}
};
