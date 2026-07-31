import {
	calcManhattanDistance,
	isLineIntersectingBox,
	type BoundingBox,
	type BoxFeatures,
	type OrthogonalDirection,
	type Point,
} from "@workspace/geometry";

/**
 * Whether an axis-aligned segment passes through the interior of a box.
 *
 * Allocation-free fast path for the axis-aligned segments orthogonal routing produces;
 * semantics match `isLineIntersectingBox`, which non-axis-aligned input falls back to.
 *
 * @param p1 - One endpoint; the pair's order is irrelevant, as the span is normalized with min/max
 * @param p2 - The other endpoint; equal x or equal y takes the fast path, anything else delegates
 * @param box - Only the four edges are read, so the lighter `BoundingBox` suffices
 * @returns true only for a true crossing; touching an edge is false
 */
const segmentCrossesBox = (p1: Point, p2: Point, box: BoundingBox): boolean => {
	if (p1.y === p2.y) {
		const y = p1.y;
		if (y <= box.top || y >= box.bottom) {
			return false;
		}
		const xMin = Math.min(p1.x, p2.x);
		const xMax = Math.max(p1.x, p2.x);
		return (
			(xMin < box.left && box.left < xMax) ||
			(xMin < box.right && box.right < xMax)
		);
	}
	if (p1.x === p2.x) {
		const x = p1.x;
		if (x <= box.left || x >= box.right) {
			return false;
		}
		const yMin = Math.min(p1.y, p2.y);
		const yMax = Math.max(p1.y, p2.y);
		return (
			(yMin < box.top && box.top < yMax) ||
			(yMin < box.bottom && box.bottom < yMax)
		);
	}
	// Does not occur in orthogonal routing, but fall back to the general check defensively.
	return isLineIntersectingBox(p1, p2, box);
};

/** Total length of the full path (sum of Manhattan distances). */
export const pathLength = (points: Point[]): number => {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += calcManhattanDistance(
			points[i - 1].x,
			points[i - 1].y,
			points[i].x,
			points[i].y,
		);
	}
	return total;
};

/**
 * Counts "reversal (backtrack)" corners: midpoints where travel reverses on the same axis,
 * i.e. the spikes a route makes by doubling back over its own stub.
 *
 * @param points - The full path including stub legs; `simplifyPath` keeps these corners
 */
export const countReversals = (points: Point[]): number => {
	let reversals = 0;
	for (let i = 1; i < points.length - 1; i++) {
		const a = points[i - 1];
		const b = points[i];
		const c = points[i + 1];
		const reverseH =
			a.y === b.y && b.y === c.y && (b.x - a.x) * (c.x - b.x) < 0;
		const reverseV =
			a.x === b.x && b.x === c.x && (b.y - a.y) * (c.y - b.y) < 0;
		if (reverseH || reverseV) {
			reversals++;
		}
	}
	return reversals;
};

/**
 * How many times the elbow passes through the shapes, summed over both.
 *
 * @param elbow - Point sequence between the stubs; the stub legs cross their own face by design
 * @param sourceBox - Raw edges to score crossings, or the clearance band to score intrusions;
 *   null for a free endpoint
 * @param targetBox - Counterpart of `sourceBox`; null for a free endpoint
 */
export const countBoxCrossings = (
	elbow: Point[],
	sourceBox: BoundingBox | null,
	targetBox: BoundingBox | null,
): number => {
	let crossings = 0;
	for (let i = 0; i < elbow.length - 1; i++) {
		const p1 = elbow[i];
		const p2 = elbow[i + 1];
		if (sourceBox && segmentCrossesBox(p1, p2, sourceBox)) {
			crossings++;
		}
		if (targetBox && segmentCrossesBox(p1, p2, targetBox)) {
			crossings++;
		}
	}
	return crossings;
};

/**
 * Grows a box outward by `margin` on every side **except the endpoint's own exit face**.
 *
 * Leaving the exit face out keeps the wire's own exit corridor outside the band, so it does not
 * score as an intrusion and the router does not jog to avoid its own face.
 */
const expandBoxExceptExit = (
	box: BoxFeatures,
	margin: number,
	exit: OrthogonalDirection,
): BoundingBox => ({
	left: box.left - (exit === "left" ? 0 : margin),
	right: box.right + (exit === "right" ? 0 : margin),
	top: box.top - (exit === "up" ? 0 : margin),
	bottom: box.bottom + (exit === "down" ? 0 : margin),
});

/**
 * The obstacle geometry a route is scored against, built once per route rather than per
 * candidate. See {@link buildObstacleBoxes}.
 */
export type ObstacleBoxes = {
	/** Raw source edges; a segment through here is a crossing. null for a free endpoint. */
	source: BoundingBox | null;
	/** Raw target edges; a segment through here is a crossing. null for a free endpoint. */
	target: BoundingBox | null;
	/** Source margin band minus its exit corridor; a segment through here is an intrusion. */
	sourceClearance: BoundingBox | null;
	/** Target margin band minus its exit corridor; a segment through here is an intrusion. */
	targetClearance: BoundingBox | null;
};

/**
 * Precomputes the obstacle geometry for a route.
 *
 * @param source - The source endpoint's AABB (null when free) and outward direction
 * @param target - The target endpoint's AABB (null when free) and outward direction
 * @param margin - Shape clearance distance in px
 */
export const buildObstacleBoxes = (
	source: { box: BoxFeatures | null; direction: OrthogonalDirection },
	target: { box: BoxFeatures | null; direction: OrthogonalDirection },
	margin: number,
): ObstacleBoxes => ({
	source: source.box,
	target: target.box,
	sourceClearance: source.box
		? expandBoxExceptExit(source.box, margin, source.direction)
		: null,
	targetClearance: target.box
		? expandBoxExceptExit(target.box, margin, target.direction)
		: null,
});

/** One turn is worth roughly a 1000px detour. */
const TURN_WEIGHT = 1_000;

/**
 * Route evaluation as a lexicographic tuple; each key strictly dominates the later ones.
 *
 * Ranking reversals above intrusions makes the router wrap around rather than spike, and
 * intrusions above aesthetic makes it keep full clearance whenever a clearance route exists.
 * Shapes closer than 2×margin overlap bands, so every candidate intrudes and the tier cancels out.
 */
export type RouteCost = {
	/** Segments passing through a shape's raw box; the hard constraint, 0 for a usable route. */
	crossings: number;
	/** Spikes where the path doubles back along the axis it just travelled. */
	reversals: number;
	/** Segments inside a margin band, excluding the endpoint's own exit corridor. */
	intrusions: number;
	/** turns × {@link TURN_WEIGHT} plus Manhattan length; smaller is better. */
	aesthetic: number;
};

/**
 * Computes the cost of one candidate.
 *
 * @param fullPath - Path as drawn, including stub legs; turns and length must be measured here
 *   because legs not aligned with the elbow add corners the elbow alone does not show
 * @param simplifiedElbow - Elbow between the stubs; crossings and intrusions must be measured here
 *   because the legs legitimately cross their own face
 * @param obstacles - Precomputed geometry from {@link buildObstacleBoxes}
 */
export const calcRouteCost = (
	fullPath: Point[],
	simplifiedElbow: Point[],
	obstacles: ObstacleBoxes,
): RouteCost => {
	const turns = Math.max(fullPath.length - 2, 0);
	return {
		crossings: countBoxCrossings(
			simplifiedElbow,
			obstacles.source,
			obstacles.target,
		),
		reversals: countReversals(fullPath),
		intrusions: countBoxCrossings(
			simplifiedElbow,
			obstacles.sourceClearance,
			obstacles.targetClearance,
		),
		aesthetic: turns * TURN_WEIGHT + pathLength(fullPath),
	};
};

/**
 * Compares two costs lexicographically (crossings → reversals → intrusions → aesthetic).
 *
 * @returns negative when `a` is better, positive when `b` is, 0 when equal
 */
export const compareCost = (a: RouteCost, b: RouteCost): number =>
	a.crossings - b.crossings ||
	a.reversals - b.reversals ||
	a.intrusions - b.intrusions ||
	a.aesthetic - b.aesthetic;

/**
 * A route candidate as seen by the total-order comparison: the cost plus the intrinsic
 * tie-breaking keys (topology signature and the concrete path).
 */
export type RouteChoice = {
	/** The primary comparison keys. */
	cost: RouteCost;
	/** Whether the candidate bends at the midline between the two shapes (the ideal S/Z crossover). */
	symmetric: boolean;
	/** The candidate's topology signature (`calcPathSignature` of the full path). */
	signature: string;
	/** The candidate's full path (the final tie-breaking key). */
	path: Point[];
};

/**
 * Compares two point sequences lexicographically (x → y per point, then length).
 *
 * @returns negative when `a` sorts first, positive when `b` does, 0 for identical paths
 */
const comparePaths = (a: Point[], b: Point[]): number => {
	const sharedLength = Math.min(a.length, b.length);
	for (let i = 0; i < sharedLength; i++) {
		if (a[i].x !== b[i].x) {
			return a[i].x - b[i].x;
		}
		if (a[i].y !== b[i].y) {
			return a[i].y - b[i].y;
		}
	}
	return a.length - b.length;
};

/**
 * **Total order** over route candidates: crossings → reversals → intrusions → aesthetic →
 * symmetric (centered crossover first) → topology signature (alphabetical) → concrete path
 * (lexicographical).
 *
 * Exact cost ties are common and can persist across a whole drag, so the trailing keys give route
 * stability without memory: all of them are intrinsic to the route's shape and move continuously
 * with the geometry, so the same candidate wins every frame inside a tie region.
 *
 * @returns negative when `a` is better, positive when `b` is, 0 for identical candidates
 */
export const compareRouteChoices = (a: RouteChoice, b: RouteChoice): number =>
	compareCost(a.cost, b.cost) ||
	(a.symmetric === b.symmetric ? 0 : a.symmetric ? -1 : 1) ||
	(a.signature < b.signature ? -1 : a.signature > b.signature ? 1 : 0) ||
	comparePaths(a.path, b.path);
