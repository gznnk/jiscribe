import type { Point } from "@jiscribe/geometry";

/**
 * Converts a point in the canvas's own (SVG / world) coordinates to client
 * coordinates — the direction a host needs to place its own DOM over a shape.
 *
 * The inverse direction is `getSvgPoint`, which sits with the gesture recognizer
 * (gestures/recognizer/utils) because that is where it came from and its module
 * is mocked wholesale by the recognizer's tests. This one is shared beyond that
 * subsystem, so it lives here.
 *
 * Both go through the live element's screen CTM rather than deriving the
 * mapping from the viewport, so the canvas being scaled or offset by the page
 * around it is accounted for.
 *
 * @param svg - The canvas's `<svg>` element; null yields the point unchanged,
 *   as does an element the browser reports no CTM for (detached / not displayed)
 * @param x - World x
 * @param y - World y
 * @returns The point in client coordinates, the space `PointerEvent.clientX/Y`
 *   is measured in
 */
export const getClientPoint = (
	svg: SVGSVGElement | null,
	x: number,
	y: number,
): Point => {
	const ctm = svg?.getScreenCTM();
	if (!svg || !ctm) {
		return { x, y };
	}

	const point = svg.createSVGPoint();
	point.x = x;
	point.y = y;
	const clientPoint = point.matrixTransform(ctm);
	return { x: clientPoint.x, y: clientPoint.y };
};
