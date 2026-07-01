import {
	calcManhattanDistance,
	isLineIntersectingBox,
	type BoxFeatures,
	type Point,
} from "@workspace/geometry";

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
 * @param box - The axis-aligned bounding box to test against
 * @returns true if the segment passes through the box interior (touching an edge is false)
 */
const segmentCrossesBox = (p1: Point, p2: Point, box: BoxFeatures): boolean => {
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
 * @param sourceBox - AABB of the source shape (null for a free endpoint)
 * @param targetBox - AABB of the target shape (null for a free endpoint)
 * @returns The total number of times the elbow passes through both shapes
 */
export const countBoxCrossings = (
	elbow: Point[],
	sourceBox: BoxFeatures | null,
	targetBox: BoxFeatures | null,
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

// Weights for the soft trade-off of aesthetics. These are the only tuning knobs.
// 1 turn is worth about a ~1000px detour.
const TURN_WEIGHT = 1_000;
// For facing endpoints, prefer the symmetric (S/Z-shaped) route that bends at the midpoint, by roughly 1 turn's worth.
const SYMMETRY_BONUS = 1_500;
// Strongly avoid reversals (a spike that backtracks along the same segment right after a stub).
// 1 reversal = about 10 turns' worth. Always make it worse than going around (more turns) so that
// for an endpoint on the far side of the exit direction, the route first goes straight out by the
// stub length and then wraps around. In layouts with no way to wrap around, all candidates are
// penalized equally, so it does not affect relative comparison and falls back naturally
// (independent of crossings = a soft constraint).
const REVERSAL_PENALTY = 10_000;

/**
 * Route evaluation. Shape crossings are compared first as a **hard constraint**, while turn count,
 * length, and symmetry are combined into a single weighted sum as **soft aesthetics**
 * (hard is lexicographic, soft is additive).
 *
 * Reversals (backtracks that go back along the same segment against the stub's push-out direction)
 * are penalized explicitly and strongly via `REVERSAL_PENALTY`. Turn count is measured on the full
 * path (including stub legs), so a reversal also appears as one corner; but that alone would make
 * wrapping around (more corners) cost more and cause the spike to be chosen, so a dedicated penalty
 * prioritizes wrapping around. In layouts with no way to wrap around, all candidates are penalized
 * equally, so it does not affect relative comparison and does not break.
 */
export type RouteCost = {
	/** The number of shape crossings (we most want this to be 0). */
	crossings: number;
	/** turns×weight + path length + reversals×penalty − symmetry bonus (smaller is better). */
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
 * @param simplifiedElbow - Only the elbow between stubs (excludes the legs). Used to detect shape crossings
 * @param sourceBox - AABB of the source shape (null for a free endpoint)
 * @param targetBox - AABB of the target shape (null for a free endpoint)
 * @param symmetric - Whether it is a symmetric (S/Z-shaped) route bending at the midpoint. If true, add an aesthetic bonus
 * @returns A pair of crossing count (hard constraint) and aesthetic score (soft)
 */
export const calcRouteCost = (
	fullPath: Point[],
	simplifiedElbow: Point[],
	sourceBox: BoxFeatures | null,
	targetBox: BoxFeatures | null,
	symmetric: boolean,
): RouteCost => {
	const turns = Math.max(fullPath.length - 2, 0);
	return {
		crossings: countBoxCrossings(simplifiedElbow, sourceBox, targetBox),
		// Soft aesthetics: emphasize turn count (×weight), prefer shorter when comparable, and for
		// facing cases prefer symmetric (S-shaped) by one step. Reversal spikes right after a stub
		// are penalized strongly in a separate term, prioritizing wrapping around.
		aesthetic:
			turns * TURN_WEIGHT +
			pathLength(fullPath) +
			countReversals(fullPath) * REVERSAL_PENALTY -
			(symmetric ? SYMMETRY_BONUS : 0),
	};
};

/**
 * Compares two costs lexicographically (crossings → aesthetic).
 *
 * @param a - A cost to compare
 * @param b - A cost to compare
 * @returns negative: a is better / positive: b is better / 0: equal
 */
export const compareCost = (a: RouteCost, b: RouteCost): number =>
	a.crossings - b.crossings || a.aesthetic - b.aesthetic;
