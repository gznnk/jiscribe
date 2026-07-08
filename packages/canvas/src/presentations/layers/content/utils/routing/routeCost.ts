import {
	calcManhattanDistance,
	isLineIntersectingBox,
	type BoundingBox,
	type BoxFeatures,
	type OrthogonalDirection,
	type Point,
} from "@workspace/geometry";

// Crossing / intrusion tests only ever read the four edges, so they take the lightweight
// `BoundingBox` (`{ top, left, right, bottom }`) rather than a full `BoxFeatures` — a real
// `BoxFeatures` is assignable to it, and the margin-band boxes are built without allocating corner
// points.

/**
 * Whether an axis-aligned segment passes through the interior of a box.
 *
 * Elbows in orthogonal routing are always horizontal/vertical segments, so this
 * decides without allocation instead of calling the general
 * `isLineIntersectingBox` (which allocates edge tuples and an inner vector each time).
 * This matters on the hot path (path recomputation while following a drag).
 *
 * The semantics match `isLineIntersectingBox` (true edge crossings and touches are excluded):
 * a horizontal segment passes through when "y is inside the top/bottom edges" and
 * "the x range straddles the left or right edge". Merely lying on a boundary (touching)
 * is excluded via strict inequalities. If a non-axis-aligned segment comes in, delegate to the general version.
 *
 * @param p1 - Segment start point
 * @param p2 - Segment end point
 * @param box - The axis-aligned box edges to test against
 * @returns true if the segment passes through the box interior (touching an edge is false)
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

/**
 * Total length of the full path (sum of Manhattan distances).
 *
 * @param points - The path's point sequence
 * @returns The sum of all segment lengths
 */
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
 * Counts the number of "reversal (backtrack)" corners in the full path.
 *
 * A midpoint where the direction of travel reverses on the same axis (a→b and b→c are
 * collinear and opposite) is treated as a reversal. This corresponds to a spike where the
 * path backtracks along the same segment right after emitting a stub (an unnatural route that
 * looks like a line sprouting from the shape's edge). Since `simplifyPath` preserves the exit
 * direction and keeps these backtrack points, the cost evaluation counts them explicitly and penalizes them.
 *
 * @param points - The full path's point sequence to evaluate
 * @returns The number of reversing (backtracking) intermediate corners
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
 * The number of times the elbow (between stubs) passes through the shapes. Excludes the stub legs.
 *
 * @param elbow - The elbow point sequence between stubs (excludes the stub legs)
 * @param sourceBox - BoundingBox of the source shape (null for a free endpoint)
 * @param targetBox - BoundingBox of the target shape (null for a free endpoint)
 * @returns The total number of times the elbow passes through both shapes
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
 * The wire necessarily leaves (and, at the far end, enters) through the margin band directly in
 * front of the exit face — that is the natural exit corridor, not an obstacle graze. Expanding every
 * side *but* that one means a segment running down the exit corridor stays outside the expanded box
 * (so it is not an intrusion), while a segment grazing any other side of the shape (a route squeezing
 * past it) still is. Without this, the exit corridor reads as an intrusion and the router adds an
 * ugly jog/staircase to avoid its own face.
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
 * The obstacle geometry a route is scored against. Built **once per route** (not per candidate):
 * the raw shape edges for hard crossing detection, and the margin-band edges (each shape expanded on
 * every side but its own exit face) for intrusion scoring — the exit-corridor exclusion that keeps
 * the natural exit from reading as a graze. See {@link buildObstacleBoxes}.
 */
export type ObstacleBoxes = {
	/** Raw source edges — a segment through here is a hard crossing (null for a free endpoint). */
	source: BoundingBox | null;
	/** Raw target edges. */
	target: BoundingBox | null;
	/** Source margin band minus its exit corridor — a segment through here is an intrusion. */
	sourceClearance: BoundingBox | null;
	/** Target margin band minus its exit corridor. */
	targetClearance: BoundingBox | null;
};

/**
 * Precomputes the obstacle geometry for a route. The clearance boxes depend only on the shapes,
 * their exit directions, and the margin — all constant across candidates — so this is called once
 * and reused, instead of re-expanding the boxes inside every candidate's cost.
 *
 * @param source - The source endpoint's AABB (null when free) and outward direction
 * @param target - The target endpoint's AABB (null when free) and outward direction
 * @param margin - The shape clearance distance (px)
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

// Weight for the soft trade-off of aesthetics — the only tuning knob left.
// 1 turn is worth about a ~1000px detour.
const TURN_WEIGHT = 1_000;

/**
 * Route evaluation as a lexicographic tuple matching the routing spec's priority order:
 * shape **crossings** (hard) → **reversals** (S1) → margin **intrusions** (S2) → **aesthetic**
 * (S3 turns + S4 length). Each earlier key strictly dominates the later ones.
 *
 * - `reversals` (backtrack spikes that go back along the same segment) rank first among the soft
 *   keys, so the router always prefers wrapping around (more turns) over a spike — an endpoint on
 *   the far side of the exit direction goes straight out and around rather than backtracking. When
 *   a layout admits no spike-free route, all candidates tie here and it falls through.
 * - `intrusions` count segments grazing within a shape's margin band (excluding each endpoint's own
 *   exit corridor, see `countMarginIntrusions`). Ranking them above the aesthetic keeps the full
 *   clearance from shapes the route passes whenever a clearance route exists — even at the cost of a
 *   couple of turns — so a route never dips inside the margin and pops back out as a shape is
 *   dragged. It does **not** force a detour for close, facing shapes: when they are nearer than
 *   2×margin their margin bands overlap, every candidate intrudes, and the tier cancels out.
 *
 * The preference for the symmetric (centered) S/Z crossover is intentionally **not** folded in here.
 * It is a tie-break in `compareRouteChoices` (see `symmetric`), applied only among cost-equal
 * candidates, so it can never override a route with fewer turns (e.g. it never turns a clean L into
 * an S).
 */
export type RouteCost = {
	/** The number of shape crossings (hard constraint; we most want this to be 0). */
	crossings: number;
	/** The number of reversal (backtrack) spikes (S1; ranked above intrusions and aesthetic). */
	reversals: number;
	/** The number of segments grazing within a shape's margin band (S2; ranked above aesthetic). */
	intrusions: number;
	/** turns×weight + path length (S3 + S4; smaller is better). */
	aesthetic: number;
};

/**
 * Computes the cost of one candidate.
 *
 * - Crossing detection uses **only the elbow part** (the source→stub / stub→target legs always
 *   exit the face outward as legitimate crossings, so they are excluded). Pass `simplifiedElbow`.
 * - Turn count and length are measured on the "full path actually drawn (including stub legs)".
 *   With the elbow alone, corners added when the stub legs don't line up with the first/last
 *   direction are missed (e.g. an elbow that exits right and immediately bends down is 1 apparent
 *   corner but 2 corners on the full path). Pass `fullPath`.
 *
 * @param fullPath - The full path actually drawn (including stub legs). Used to measure turn count and length
 * @param simplifiedElbow - Only the elbow between stubs (excludes the legs). Used to detect shape crossings / margin intrusions
 * @param obstacles - Precomputed obstacle geometry (raw edges + margin-band edges), see {@link buildObstacleBoxes}
 * @returns The crossings / intrusions (hard tiers) and aesthetic score (soft)
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
		// An intrusion is a segment through a shape's margin band (its raw box grown by the margin on
		// every side but the exit face); scored with the same edge-crossing test as `crossings`.
		intrusions: countBoxCrossings(
			simplifiedElbow,
			obstacles.sourceClearance,
			obstacles.targetClearance,
		),
		// Soft aesthetics: emphasize turn count (×weight), prefer shorter when comparable. Reversals
		// and margin clearance are ranked ahead of this as their own tiers; centering the S/Z crossover
		// is a tie-break after it (see compareRouteChoices), not folded in here.
		aesthetic: turns * TURN_WEIGHT + pathLength(fullPath),
	};
};

/**
 * Compares two costs lexicographically (crossings → reversals → intrusions → aesthetic).
 *
 * @param a - A cost to compare
 * @param b - A cost to compare
 * @returns negative: a is better / positive: b is better / 0: equal
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
	/** The candidate's cost (crossings → aesthetic, the primary keys). */
	cost: RouteCost;
	/**
	 * Whether the candidate bends at the center between the two shapes (the ideal S/Z crossover).
	 * Used as a tie-break among cost-equal candidates so the jog sits at the midline rather than
	 * hugging one shape's margin.
	 */
	symmetric: boolean;
	/** The candidate's topology signature (`calcPathSignature` of the full path). */
	signature: string;
	/** The candidate's full path (the final tie-breaking key). */
	path: Point[];
};

/**
 * Compares two point sequences lexicographically (x → y per point, then length).
 * Used as the final tie-breaking key; it is visually continuous, because two same-topology
 * candidates can only swap the winner at the moment their paths coincide.
 *
 * @param a - A path to compare
 * @param b - A path to compare
 * @returns negative: a first / positive: b first / 0: identical paths
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
 * **Total order** over route candidates: crossings → aesthetic → symmetric (centered crossover
 * first) → topology signature (alphabetical) → concrete path (lexicographical).
 *
 * `symmetric` sits between the cost and the intrinsic keys: among cost-equal candidates it prefers
 * the one bending at the center between the two shapes, so an S/Z jogs at the midline rather than
 * hugging one shape's margin. Being a tie-break (not a cost term), it never overrides a cheaper
 * route — a clean L (fewer turns) still beats a centered S, because they differ on aesthetic first.
 *
 * The point of the trailing keys is route **stability without memory**. Layouts with exact cost
 * ties are common and can persist across a whole drag (e.g. for equal-sized boxes, wrapping over
 * the top and under the bottom have identical Manhattan length for *every* vertical offset — the
 * constraining box swaps roles). If ties were left to candidate enumeration order, the winner
 * would flip arbitrarily while an owner moves, because the enumerated channel set shifts with the
 * boxes. Both the centered crossover and the signature are intrinsic to the route's shape and move
 * continuously with the geometry, so inside a tie region the same convention wins every frame, and
 * route changes happen only at genuine cost crossings.
 *
 * @param a - A candidate to compare
 * @param b - A candidate to compare
 * @returns negative: a is better / positive: b is better / 0: identical candidates
 */
export const compareRouteChoices = (a: RouteChoice, b: RouteChoice): number =>
	compareCost(a.cost, b.cost) ||
	(a.symmetric === b.symmetric ? 0 : a.symmetric ? -1 : 1) ||
	(a.signature < b.signature ? -1 : a.signature > b.signature ? 1 : 0) ||
	comparePaths(a.path, b.path);
