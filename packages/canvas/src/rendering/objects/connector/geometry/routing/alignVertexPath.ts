import type { OrthogonalDirection, Point } from "@jiscribe/geometry";

/**
 * Whether the segment from an end vertex to its endpoint has to be horizontal.
 *
 * The answer comes from the vertex's inward neighbour: the two of them already form an axis-aligned
 * segment, and the endpoint's segment is the other axis. Deciding it from the endpoint's exit
 * direction instead would flip the axis whenever that direction changes — an endpoint re-anchored
 * to another face, a shape rotated a quarter turn, an endpoint set free — and moving the vertex on
 * the flipped axis breaks the very segment it shares with its neighbour, leaving a diagonal in the
 * middle of a right-angle path.
 */
const wantsHorizontal = (vertex: Point, neighbour: Point): boolean =>
	// Neighbour on the same x means that segment is vertical, so this one is horizontal.
	neighbour.x === vertex.x;

/** Slides a vertex onto the line its endpoint sits on, keeping the coordinate it shares inward. */
const alignToEndpoint = (
	vertex: Point,
	neighbour: Point,
	endpoint: Point,
): Point =>
	wantsHorizontal(vertex, neighbour)
		? { x: vertex.x, y: endpoint.y }
		: { x: endpoint.x, y: vertex.y };

/** Whether the line leaves an endpoint along the x axis, so its first segment is horizontal. */
const isHorizontalExit = (direction: OrthogonalDirection): boolean =>
	direction === "left" || direction === "right";

/**
 * A single vertex has exactly two right-angled positions: sharing y with the source and x with the
 * target (the source's segment horizontal), or the mirror. There is no stored neighbour to take an
 * axis from, and the exit directions cannot answer it either — a run dropped onto the far shape's
 * face line leaves a corner whose arriving segment runs along that face, so both exits sit on the
 * same axis while the corner is perfectly valid. The corner therefore goes to whichever of the two
 * positions is nearer to where it was — continuity with the drawn path — and only a dead tie falls
 * back to the exit directions.
 */
const alignSingleVertex = (
	vertex: Point,
	sourcePoint: Point,
	targetPoint: Point,
	sourceDirection: OrthogonalDirection,
	targetDirection: OrthogonalDirection,
): Point => {
	const horizontalFirst = { x: targetPoint.x, y: sourcePoint.y };
	const verticalFirst = { x: sourcePoint.x, y: targetPoint.y };
	const distanceTo = (candidate: Point): number =>
		(vertex.x - candidate.x) ** 2 + (vertex.y - candidate.y) ** 2;
	const horizontalDistance = distanceTo(horizontalFirst);
	const verticalDistance = distanceTo(verticalFirst);
	if (horizontalDistance === verticalDistance) {
		return isHorizontalExit(sourceDirection) ||
			!isHorizontalExit(targetDirection)
			? horizontalFirst
			: verticalFirst;
	}
	return horizontalDistance < verticalDistance
		? horizontalFirst
		: verticalFirst;
};

/**
 * Adapts a stored vertex list to where its endpoints are **now**.
 *
 * Endpoints are not stored — they are resolved from the anchors every frame — so a vertex list left
 * exactly as written would stop being axis-aligned the moment a connected shape moved, and the
 * segment touching the endpoint would go diagonal. Moving the vertex next to each endpoint along
 * with it keeps the corner where the author put it on the axis that matters and lets the other
 * coordinate follow the shape.
 *
 * Only the two end vertices are touched; everything between them is drawn exactly as stored. When a
 * shape moves far enough that the path doubles back on itself, it is left doubled back: reshaping
 * the author's route to keep it tidy is not this function's business. What it does guarantee is that
 * a path that was axis-aligned when stored stays axis-aligned, whatever the endpoints do.
 *
 * @param vertices - The connector's stored vertices, in source → target order, at least one
 * @param sourcePoint - The resolved source endpoint
 * @param targetPoint - The resolved target endpoint
 * @param sourceDirection - The direction the line leaves the source (`calcEndpointDirection`), used
 *   only to break a dead tie between a single vertex's two possible corners
 * @param targetDirection - The direction the line leaves the target, used under the same condition
 * @returns A new vertex list with the first and last entry aligned to their endpoint
 */
export const alignVertexPath = (
	vertices: readonly Point[],
	sourcePoint: Point,
	targetPoint: Point,
	sourceDirection: OrthogonalDirection,
	targetDirection: OrthogonalDirection,
): Point[] => {
	if (vertices.length === 1) {
		return [
			alignSingleVertex(
				vertices[0],
				sourcePoint,
				targetPoint,
				sourceDirection,
				targetDirection,
			),
		];
	}
	const aligned = vertices.map((vertex) => ({ x: vertex.x, y: vertex.y }));
	const last = aligned.length - 1;
	aligned[0] = alignToEndpoint(aligned[0], aligned[1], sourcePoint);
	aligned[last] = alignToEndpoint(
		aligned[last],
		aligned[last - 1],
		targetPoint,
	);
	return aligned;
};
