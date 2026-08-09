import type {
	BoxFeatures,
	OrthogonalDirection,
	Point,
} from "@jiscribe/geometry";

/**
 * Returns the endpoint's stub point. Along the exit-direction axis it pushes out to the
 * **bounding box edge + margin** (reliably exiting the AABB even for rotated shapes), while the
 * orthogonal axis keeps the endpoint coordinate.
 *
 * For non-rotated shapes the face center lies on the AABB edge, so "edge + margin" coincides with
 * "face center + margin", matching the previous behavior. For rotated shapes the face center moves
 * inside the AABB, which previously caused a fixed margin alone to fail to exit the AABB and embed
 * into it; this resolves that.
 *
 * Assumption: `point` lies on the edge in the exit direction (holds exactly for connectPoint = edge
 * center). If `point` is not on the edge (e.g. a center anchor), the stub leg (point → stub) can
 * graze the AABB along the orthogonal axis (a v1 approximation; the real impact is small when
 * connectPoint is the norm).
 *
 * @param point - The endpoint coordinate (assumed to be on the exit-direction edge)
 * @param direction - The orthogonal direction in which the line exits the shape
 * @param box - The shape's axis-aligned bounding box
 * @param margin - The push-out distance from the edge (px)
 * @returns The stub point pushed out along the exit direction (the orthogonal-axis coordinate is left unchanged)
 */
export const stubPoint = (
	point: Point,
	direction: OrthogonalDirection,
	box: BoxFeatures,
	margin: number,
): Point => {
	switch (direction) {
		case "up":
			return { x: point.x, y: box.top - margin };
		case "down":
			return { x: point.x, y: box.bottom + margin };
		case "left":
			return { x: box.left - margin, y: point.y };
		case "right":
			return { x: box.right + margin, y: point.y };
	}
};

/**
 * The forward (signed) distance to the other endpoint along the exit direction.
 * Positive means the other is ahead in the exit direction; negative means behind (on the far side).
 *
 * @param point - This endpoint's coordinate
 * @param direction - This endpoint's outward direction
 * @param other - The other endpoint's coordinate
 * @returns The forward distance along the exit direction (ahead is positive)
 */
const forwardDistance = (
	point: Point,
	direction: OrthogonalDirection,
	other: Point,
): number => {
	switch (direction) {
		case "up":
			return point.y - other.y;
		case "down":
			return other.y - point.y;
		case "left":
			return point.x - other.x;
		case "right":
			return other.x - point.x;
	}
};

/**
 * Stub-length clamp that prevents, for close endpoints, the stub push-out from
 * overshooting the other side and inducing a wasteful wrap-around (a route that loops all the way around).
 *
 * Only when the other endpoint is **ahead** in the exit direction, the stub length is limited to
 * "half the forward distance to the other". When both ends are clamped the same way, the two stubs
 * meet exactly at the midpoint, avoiding extra bends (a straight line if aligned, a Z bending once
 * at the midpoint if offset).
 *
 * - At forward distance ≥ 2×margin (i.e. more than the default 60px apart), at least `margin/2` is
 *   secured, so it stays at the full margin (switching smoothly without a discontinuity at the threshold).
 * - Layouts where the other is behind (on the far side) (forward distance ≤ 0) are not clamped.
 *   Since the route must first go straight out and then wrap around, trimming the stub would induce a
 *   reversal spike (see #77).
 *
 * A shortened stub can land inside the *other* shape's margin band, but that no longer forces an ugly
 * staircase: the margin-intrusion cost excludes each endpoint's own exit corridor (see
 * `expandBoxExceptExit` in `routeCost.ts`), so the clean route past it wins on merit.
 *
 * @param point - This endpoint's coordinate
 * @param direction - This endpoint's outward direction
 * @param other - The other endpoint's coordinate
 * @param margin - The default stub length (px)
 * @returns The clamped stub length (px)
 */
export const clampStubMargin = (
	point: Point,
	direction: OrthogonalDirection,
	other: Point,
	margin: number,
): number => {
	const forward = forwardDistance(point, direction, other);
	if (forward <= 0) {
		return margin;
	}
	return Math.min(margin, forward / 2);
};
