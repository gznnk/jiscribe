import type { Point } from "@workspace/geometry";

import { simplifyPath } from "./simplifyPath";
import { stubPoint } from "./stub";
import type {
	OrthogonalConnectorEndpoint,
	RouteOrthogonalConnectorOptions,
} from "./types";
import { DEFAULT_CONNECTOR_MARGIN } from "../../../../../constants/connectorRouting";

/** Tolerance for perimeter-parameter comparisons (px). Used for corner/endpoint overlap detection. */
const EPS = 1e-6;

/**
 * Generates the orthogonal path of a self-loop connecting two edges of the same shape.
 *
 * Consider a **ring rectangle** formed by expanding the shape's AABB outward by `margin`, and
 * create a **stub** by pushing each endpoint out from its face onto the ring edge. Connecting the
 * two stubs by traversing the ring perimeter in the "shorter direction" yields a rectangular loop
 * that does not pass through the shape:
 * - Adjacent edges → an L shape going around one shared corner
 * - Same edge (assumed the caller restricts to distinct anchors) → a U shape bulging from that edge
 * - Facing edges → wrapping around one side of the shape (clockwise)
 *
 * The return value is the full path including endpoints `[source.point, …, target.point]`
 * (collinear/duplicate points already collapsed).
 * Both ends belong to the same shape, so the boxes are assumed identical (source.box is used).
 *
 * @param source - The source endpoint (coordinate, outward direction, AABB to avoid)
 * @param target - The target endpoint (a self-loop, so the box is the same shape as source)
 * @param options - Tuning options such as margin (ring bulge, px). Defaults to DEFAULT_CONNECTOR_MARGIN
 * @returns The orthogonal full path including endpoints `[source.point, …, target.point]` (collinear/duplicate points already collapsed)
 */
export const routeSelfLoop = (
	source: OrthogonalConnectorEndpoint,
	target: OrthogonalConnectorEndpoint,
	options: RouteOrthogonalConnectorOptions = {},
): Point[] => {
	const margin = options.margin ?? DEFAULT_CONNECTOR_MARGIN;
	const box = source.box ?? target.box;

	// A self-loop with no box (free endpoint) is unexpected. Avoid degeneracy and return a direct connection.
	if (!box) {
		return simplifyPath([source.point, target.point]);
	}

	const sourceStub = stubPoint(source.point, source.direction, box, margin);
	const targetStub = stubPoint(target.point, target.direction, box, margin);

	// Ring rectangle (AABB + margin). Stubs lie on the edges of this rectangle.
	const ring: RingRect = {
		left: box.left - margin,
		top: box.top - margin,
		right: box.right + margin,
		bottom: box.bottom + margin,
	};
	const width = ring.right - ring.left;
	const height = ring.bottom - ring.top;
	const perimeter = 2 * width + 2 * height;

	// Traverse the ring perimeter in the shorter direction between the stubs and enumerate the corners passed.
	const sourceParam = perimeterParam(sourceStub, ring, width, height);
	const targetParam = perimeterParam(targetStub, ring, width, height);

	const cwCorners = arcCorners(
		sourceParam,
		targetParam,
		true,
		ring,
		width,
		height,
		perimeter,
	);
	const ccwCorners = arcCorners(
		sourceParam,
		targetParam,
		false,
		ring,
		width,
		height,
		perimeter,
	);

	const cwPath = [sourceStub, ...cwCorners, targetStub];
	const ccwPath = [sourceStub, ...ccwCorners, targetStub];
	const ringPath = pathLength(cwPath) <= pathLength(ccwPath) ? cwPath : ccwPath;

	return simplifyPath([source.point, ...ringPath, target.point]);
};

type RingRect = { left: number; top: number; right: number; bottom: number };

/**
 * Converts a point on the ring rectangle's perimeter into a scalar position measured clockwise from the top-left.
 * Range: top edge [0, W] → right edge [W, W+H] → bottom edge [W+H, 2W+H] → left edge [2W+H, 2W+2H].
 * A corner yields the same value under either adjacent edge's formula. The point is assumed to be on
 * a ring edge, but each coordinate is clamped to the ring range just in case.
 *
 * @param p - A point on a ring edge
 * @param ring - The ring rectangle (AABB + margin)
 * @param width - The ring rectangle's width
 * @param height - The ring rectangle's height
 * @returns The scalar position along the perimeter measured clockwise from the top-left
 */
const perimeterParam = (
	p: Point,
	ring: RingRect,
	width: number,
	height: number,
): number => {
	const clampX = Math.min(Math.max(p.x, ring.left), ring.right);
	const clampY = Math.min(Math.max(p.y, ring.top), ring.bottom);

	if (Math.abs(p.y - ring.top) <= EPS) {
		return clampX - ring.left;
	}
	if (Math.abs(p.x - ring.right) <= EPS) {
		return width + (clampY - ring.top);
	}
	if (Math.abs(p.y - ring.bottom) <= EPS) {
		return width + height + (ring.right - clampX);
	}
	// The rest is the left edge.
	return 2 * width + height + (ring.bottom - clampY);
};

/**
 * Converts a perimeter parameter back into a coordinate on the ring perimeter.
 *
 * @param param - The scalar position along the perimeter (normalized by perimeter)
 * @param ring - The ring rectangle
 * @param width - The ring rectangle's width
 * @param height - The ring rectangle's height
 * @param perimeter - The ring perimeter length (2W + 2H)
 * @returns The coordinate on the perimeter
 */
const pointAtParam = (
	param: number,
	ring: RingRect,
	width: number,
	height: number,
	perimeter: number,
): Point => {
	const t = ((param % perimeter) + perimeter) % perimeter;
	if (t <= width) {
		return { x: ring.left + t, y: ring.top };
	}
	if (t <= width + height) {
		return { x: ring.right, y: ring.top + (t - width) };
	}
	if (t <= 2 * width + height) {
		return { x: ring.right - (t - (width + height)), y: ring.bottom };
	}
	return { x: ring.left, y: ring.bottom - (t - (2 * width + height)) };
};

/**
 * When traversing the ring perimeter from source to target in the given direction
 * (clockwise / counter-clockwise), returns the corners that lie inside that arc in traversal order.
 *
 * @param sourceParam - Perimeter parameter of the source stub
 * @param targetParam - Perimeter parameter of the target stub
 * @param clockwise - Traversal direction (true: clockwise / false: counter-clockwise)
 * @param ring - The ring rectangle
 * @param width - The ring rectangle's width
 * @param height - The ring rectangle's height
 * @param perimeter - The ring perimeter length
 * @returns The corners inside the arc, in traversal order
 */
const arcCorners = (
	sourceParam: number,
	targetParam: number,
	clockwise: boolean,
	ring: RingRect,
	width: number,
	height: number,
	perimeter: number,
): Point[] => {
	// Perimeter parameters of the corners: TL(0) / TR(W) / BR(W+H) / BL(2W+H).
	const cornerParams = [0, width, width + height, 2 * width + height];
	const arc = clockwise
		? (targetParam - sourceParam + perimeter) % perimeter
		: (sourceParam - targetParam + perimeter) % perimeter;

	return cornerParams
		.map((c) => ({
			param: c,
			offset: clockwise
				? (c - sourceParam + perimeter) % perimeter
				: (sourceParam - c + perimeter) % perimeter,
		}))
		.filter((x) => x.offset > EPS && x.offset < arc - EPS)
		.sort((a, b) => a.offset - b.offset)
		.map((x) => pointAtParam(x.param, ring, width, height, perimeter));
};

/**
 * Total length of an orthogonal path (sum of segment lengths).
 *
 * @param points - The path's point sequence
 * @returns The sum of all segment lengths
 */
const pathLength = (points: Point[]): number => {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total +=
			Math.abs(points[i].x - points[i - 1].x) +
			Math.abs(points[i].y - points[i - 1].y);
	}
	return total;
};
