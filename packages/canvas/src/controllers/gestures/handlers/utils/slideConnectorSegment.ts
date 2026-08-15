import type { Point } from "@jiscribe/geometry";

import { PRECISION } from "../../../../constants/precision";

/**
 * Two coordinates this close apart lie on the same drawn line. Stored vertices settle onto
 * PRECISION.COORDINATE (reconcileConnectorVertices) while endpoints resolve unrounded, so
 * segments that overlap on screen can sit a rounding error apart in the data.
 */
const COLINEAR_TOLERANCE = 10 ** -PRECISION.COORDINATE;

/**
 * Drops vertices that repeat the one before them.
 *
 * Dropping a run exactly onto a parallel one lands vertices from both on the same spot. Storing
 * them would leave a zero-length segment in the path — invisible, but a corner the author never
 * made and a stop that later edits have to step over.
 */
const withoutRepeats = (vertices: Point[]): Point[] =>
	vertices.filter(
		(vertex, index) =>
			index === 0 ||
			vertex.x !== vertices[index - 1].x ||
			vertex.y !== vertices[index - 1].y,
	);

/**
 * Slides a segment of an orthogonal connector across itself and returns the connector's new
 * vertices. Straight routing moves a segment in both axes instead (see translateConnectorSegment).
 *
 * The drawn path is `[source, ...vertices, target]`, so the vertices are `path.slice(1, -1)` — which
 * is also how a route the engine chose becomes editable: the corners it drew are taken as the
 * starting vertex list, and from then on the stored vertices are the path.
 *
 * What moves is not the grabbed segment alone but the whole **run**: the grabbed segment plus any
 * neighbouring segments lying on the same line (a doubled-back route folds legs onto each other,
 * and on screen they are one line). Moving only the grabbed part would leave the folded leg hanging
 * off a corner vertex diagonally. The run slides across itself keeping its full extent; when it
 * reaches an endpoint, the endpoint stays pinned to its shape's face and instead joins the moved
 * run by a new segment dropping perpendicularly from it. A path that is one run from source to
 * target gains such a perpendicular on each side.
 *
 * Nothing here keeps the result tidy: dragged far enough the path doubles back over a shape, and it
 * is left that way, and a leg an earlier drag left behind can simply be grabbed and moved again.
 * What it does clean up are the corners its own move has degenerated: vertices that repeat their
 * neighbour (see withoutRepeats), vertices landing exactly on an endpoint, and vertices whose
 * neighbouring segments have become colinear — a run landing on the line of an adjacent segment
 * leaves no corner between them, and an overshoot folding back on itself would freeze into a stub
 * nobody can edit (see isNoCorner). After every drag, each stored corner is a real right angle.
 *
 * @param path - The drawn path the drag started from, endpoints included
 * @param segmentIndex - The segment being dragged, spanning `path[i]` → `path[i + 1]`
 * @param axis - The coordinate the drag changes ("y" for a horizontal segment)
 * @param value - Where that coordinate lands
 * @returns The connector's new vertices, in source → target order
 */
export const slideConnectorSegment = (
	path: readonly Point[],
	segmentIndex: number,
	axis: "x" | "y",
	value: number,
): Point[] => {
	const vertices = path.slice(1, -1);
	const moved = (point: Point): Point =>
		axis === "y" ? { x: point.x, y: value } : { x: value, y: point.y };

	// The run: the maximal stretch of segments on the grabbed segment's line. Segment k spans
	// path[k] → path[k+1], so the segment before lo joins the line iff path[lo - 1] is on it.
	const lineCoord = path[segmentIndex][axis];
	const isOnLine = (point: Point): boolean =>
		Math.abs(point[axis] - lineCoord) <= COLINEAR_TOLERANCE;
	let lo = segmentIndex;
	while (lo > 0 && isOnLine(path[lo - 1])) {
		lo--;
	}
	let hi = segmentIndex;
	while (hi < path.length - 2 && isOnLine(path[hi + 2])) {
		hi++;
	}

	const source = path[0];
	const target = path[path.length - 1];
	const samePoint = (a: Point, b: Point): boolean =>
		Math.abs(a.x - b.x) <= COLINEAR_TOLERANCE &&
		Math.abs(a.y - b.y) <= COLINEAR_TOLERANCE;
	// Colinear neighbours mean the vertex is no corner: the path either passes straight through or
	// folds back on itself there. A fold's turnaround has no perpendicular segment to grab, so
	// keeping it would freeze an overshoot stub nobody can edit — both kinds go.
	const isNoCorner = (prev: Point, vertex: Point, next: Point): boolean => {
		const onVerticalLine =
			Math.abs(prev.x - vertex.x) <= COLINEAR_TOLERANCE &&
			Math.abs(next.x - vertex.x) <= COLINEAR_TOLERANCE;
		const onHorizontalLine =
			Math.abs(prev.y - vertex.y) <= COLINEAR_TOLERANCE &&
			Math.abs(next.y - vertex.y) <= COLINEAR_TOLERANCE;
		return onVerticalLine || onHorizontalLine;
	};
	// One sweep of the cleanup: repeats, then vertices sitting on an endpoint (the perpendicular
	// has zero length: the run was dragged back onto the endpoint's own line), then non-corners.
	const cleanupPass = (candidates: Point[]): Point[] => {
		const kept = withoutRepeats(candidates);
		let first = 0;
		let last = kept.length;
		while (first < last && samePoint(kept[first], source)) {
			first++;
		}
		while (last > first && samePoint(kept[last - 1], target)) {
			last--;
		}
		const trimmed = kept.slice(first, last);
		const corners: Point[] = [];
		for (let i = 0; i < trimmed.length; i++) {
			const prev = corners[corners.length - 1] ?? source;
			const next = trimmed[i + 1] ?? target;
			if (!isNoCorner(prev, trimmed[i], next)) {
				corners.push(trimmed[i]);
			}
		}
		return corners;
	};
	// Drops the corners the move has degenerated. Removing a vertex changes its neighbours'
	// context — dropping a fold can leave the vertex before it colinear with the one after — so the
	// sweep repeats until nothing is removed. What survives is a path whose every stored corner is
	// a real right angle.
	const cleanedUp = (candidates: Point[]): Point[] => {
		let corners = candidates;
		for (;;) {
			const cleaned = cleanupPass(corners);
			if (cleaned.length === corners.length) {
				return cleaned;
			}
			corners = cleaned;
		}
	};

	const atSource = lo === 0;
	const atTarget = hi === path.length - 2;

	// The run covers path[lo] → path[hi + 1], whose interior is vertices[lo - 1 .. hi] — all moved.
	// A side where the run reaches an endpoint contributes moved(endpoint), the perpendicular's
	// foot; the other side keeps its remaining vertices as they are.
	const beforeRun = atSource ? [moved(source)] : vertices.slice(0, lo - 1);
	const movedRun = vertices.slice(atSource ? 0 : lo - 1, hi + 1).map(moved);
	const afterRun = atTarget ? [moved(target)] : vertices.slice(hi + 1);
	return cleanedUp([...beforeRun, ...movedRun, ...afterRun]);
};
