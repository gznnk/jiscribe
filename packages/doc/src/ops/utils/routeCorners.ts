import type { Point } from "@jiscribe/geometry";
import type { LayoutSide } from "@jiscribe/layout";

/**
 * The corners as the document stores them: on whole pixels, but for the coordinate
 * the corner next to each end shares with that end, which stays the end's own so the
 * drawn line runs as straight as the routed one (the canvas slides that corner onto
 * the end's line, see alignVertexPath). A corner left equal to the one before it, or on
 * the straight line between its neighbours, is dropped.
 *
 * @param points - The corners as routed, the ends left out (see RoutedEdge.points)
 * @param sourceSide - The side the source end sits on: top and bottom keep the first
 *   corner's x, left and right its y
 * @param targetSide - The same for the target end and the last corner
 */
export const toStoredRouteCorners = (
	points: readonly Point[],
	sourceSide: LayoutSide,
	targetSide: LayoutSide,
): Point[] => {
	const keepsX = (side: LayoutSide): boolean =>
		side === "top" || side === "bottom";
	const rounded = points.map((point, index) => {
		const isFirst = index === 0;
		const isLast = index === points.length - 1;
		const keepX =
			(isFirst && keepsX(sourceSide)) || (isLast && keepsX(targetSide));
		const keepY =
			(isFirst && !keepsX(sourceSide)) || (isLast && !keepsX(targetSide));
		return {
			x: keepX ? point.x : Math.round(point.x),
			y: keepY ? point.y : Math.round(point.y),
		};
	});
	const distinct = rounded.filter(
		(point, index) =>
			index === 0 ||
			point.x !== rounded[index - 1].x ||
			point.y !== rounded[index - 1].y,
	);
	return distinct.filter((point, index) => {
		if (index === 0 || index === distinct.length - 1) {
			return true;
		}
		const previous = distinct[index - 1];
		const next = distinct[index + 1];
		return !(
			(previous.x === point.x && point.x === next.x) ||
			(previous.y === point.y && point.y === next.y)
		);
	});
};
