import { roundToDecimal, snapToDirection } from "@jiscribe/geometry";
import type { OrthogonalDirection, Point } from "@jiscribe/geometry";

/** Decimal places for the position (a 0..1 ratio; 4 ≒ sub-pixel up to ~10k px boxes). */
const EDGE_POSITION_PRECISION = 4;

/**
 * Which edge of a box centered on the origin a local point attaches to, and
 * where along that edge: `direction` from the dominant axis (normalized to half
 * extents), `position` from the projection onto that edge, clamped to 0..1 and
 * rounded to {@link EDGE_POSITION_PRECISION} decimals. A zero extent reads as
 * 0 on that axis and puts the position at 0.5.
 */
export const calcEdgeDirectionAndPosition = (
	localPoint: Point,
	width: number,
	height: number,
): { direction: OrthogonalDirection; position: number } => {
	const normalizedX = width === 0 ? 0 : localPoint.x / (width / 2);
	const normalizedY = height === 0 ? 0 : localPoint.y / (height / 2);
	const direction = snapToDirection(normalizedX, normalizedY);

	const isHorizontalEdge = direction === "up" || direction === "down";
	const coordinate = isHorizontalEdge ? localPoint.x : localPoint.y;
	const extent = isHorizontalEdge ? width : height;
	const rawPosition = extent === 0 ? 0.5 : (coordinate + extent / 2) / extent;
	const position = roundToDecimal(
		Math.min(Math.max(rawPosition, 0), 1),
		EDGE_POSITION_PRECISION,
	);

	return { direction, position };
};
