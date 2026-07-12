import type { BoundingBox } from "@workspace/geometry";

import type {
	SnapCandidate,
	SnapCandidates,
	SnapAxisFeedback,
	SnapFeedback,
} from "../../../../CanvasTypes";

export const SNAP_THRESHOLD_PX = 8;

/** Epsilon for absorbing floating-point error (SVG units) */
const SNAP_EPSILON = 0.5;

/**
 * Shared empty set representing "no exclusions". Used as the default when excludeIds is
 * omitted, avoiding creating a Set on each call.
 */
const NO_EXCLUDE: ReadonlySet<string> = new Set();

type SnapDelta = { x: number; y: number };

/**
 * Return value of findNearest. Holds the snapped candidates, coordinate, and original edge value.
 * Used by passing to buildSnapFeedback to generate guide lines.
 */
export type SnapAxisResult = {
	candidates: SnapCandidate[];
	snapCoordinate: number;
	draggedEdgeValue: number;
} | null;

export type FindSnapResult = {
	delta: SnapDelta;
	xResult: SnapAxisResult;
	yResult: SnapAxisResult;
};

/**
 * Returns the smallest index (lower bound) in the sorted array where coordinate >= value.
 */
const lowerBound = (candidates: SnapCandidate[], value: number): number => {
	let lo = 0;
	let hi = candidates.length;
	while (lo < hi) {
		const mid = (lo + hi) >>> 1;
		if (candidates[mid].coordinate < value) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}
	return lo;
};

/**
 * Collects non-excluded candidates within ±SNAP_EPSILON of snapCoordinate from the sorted array via binary search.
 * Absorbs rounding error to bundle them onto the same snap line (with strict equality, near-identical coordinates from separate computations would not group).
 */
const collectWithinEpsilon = (
	candidates: SnapCandidate[],
	snapCoordinate: number,
	excludeIds: ReadonlySet<string>,
): SnapCandidate[] => {
	const result: SnapCandidate[] = [];
	const upper = snapCoordinate + SNAP_EPSILON;
	for (
		let i = lowerBound(candidates, snapCoordinate - SNAP_EPSILON);
		i < candidates.length && candidates[i].coordinate <= upper;
		i++
	) {
		if (!excludeIds.has(candidates[i].objectId)) {
			result.push(candidates[i]);
		}
	}
	return result;
};

/**
 * Returns the nearest candidate group within threshold from the sorted candidate array.
 * Assumes candidates are sorted ascending by coordinate and binary-searches each edgeValue
 * (O(edges × log candidates)). Candidates whose objectId is in excludeIds are excluded.
 * Candidates at the same coordinate are returned together (supporting simultaneous snapping to multiple objects).
 */
const findNearest = (
	candidates: SnapCandidate[],
	edges: number[],
	threshold: number,
	excludeIds: ReadonlySet<string>,
): SnapAxisResult => {
	let bestDist = threshold;
	let bestCoordinate: number | null = null;
	let bestDraggedEdgeValue = 0;

	for (const edgeValue of edges) {
		const insert = lowerBound(candidates, edgeValue);

		// First non-excluded candidate to the left of the insert position (coordinate <= edgeValue)
		let left = insert - 1;
		while (left >= 0 && excludeIds.has(candidates[left].objectId)) {
			left--;
		}
		// First non-excluded candidate to the right of the insert position (coordinate >= edgeValue)
		let right = insert;
		while (
			right < candidates.length &&
			excludeIds.has(candidates[right].objectId)
		) {
			right++;
		}

		// Take whichever of left/right is closer. On a tie, prefer the smaller-coordinate left side,
		// preserving the tiebreak of the linear-scan version (ascending scan, strict less).
		const leftDist =
			left >= 0 ? edgeValue - candidates[left].coordinate : Infinity;
		const rightDist =
			right < candidates.length
				? candidates[right].coordinate - edgeValue
				: Infinity;
		const nearestDist = Math.min(leftDist, rightDist);

		if (nearestDist < bestDist) {
			bestDist = nearestDist;
			bestCoordinate =
				leftDist <= rightDist
					? candidates[left].coordinate
					: candidates[right].coordinate;
			bestDraggedEdgeValue = edgeValue;
		}
	}

	if (bestCoordinate === null) {
		return null;
	}

	return {
		candidates: collectWithinEpsilon(candidates, bestCoordinate, excludeIds),
		snapCoordinate: bestCoordinate,
		draggedEdgeValue: bestDraggedEdgeValue,
	};
};

/**
 * For each edge after snapping, collects the guides that match a candidate.
 * The edge aligned by the primary snap always matches; the other edge matches only when the
 * object's width/height fits exactly between two snap lines.
 *
 * @param snappedEdges - Edge coordinates after snapping (for the x-axis, [left, right])
 * @param candidates - Sorted snap candidates
 * @param perpendicularMin - The group-side perpendicular range of the guide line (start)
 * @param perpendicularMax - The group-side perpendicular range of the guide line (end)
 * @param excludeIds - objectIds to exclude from the guides (e.g. the object being dragged)
 */
const collectAxisFeedbacks = (
	snappedEdges: number[],
	candidates: SnapCandidate[],
	perpendicularMin: number,
	perpendicularMax: number,
	excludeIds: ReadonlySet<string>,
): SnapAxisFeedback[] => {
	const feedbacks: SnapAxisFeedback[] = [];

	// Deduplicate identical values (e.g. when left=right in point snapping)
	const uniqueEdges = [...new Set(snappedEdges)];

	for (const edgeValue of uniqueEdges) {
		const matching = collectWithinEpsilon(candidates, edgeValue, excludeIds);
		if (matching.length === 0) {
			continue;
		}

		const sourcePerpendicularMin = Math.min(
			...matching.map((c) => c.perpendicularMin),
		);
		const sourcePerpendicularMax = Math.max(
			...matching.map((c) => c.perpendicularMax),
		);
		feedbacks.push({
			coordinate: matching[0].coordinate,
			lineStart: Math.min(perpendicularMin, sourcePerpendicularMin),
			lineEnd: Math.max(perpendicularMax, sourcePerpendicularMax),
			sourceObjectIds: [...new Set(matching.map((c) => c.objectId))],
		});
	}

	return feedbacks;
};

/**
 * Generates guide-line feedback from the actual BBox after snapping.
 * Pass the xResult/yResult obtained from findSnap and the actual BBox after snapping is applied.
 * For Drag, groupBBox + delta corresponds to actualBBox; for transform snapping, passing the BBox
 * after re-running calculateResize aligns the guide-line positions with the actual shape.
 * For point snapping (vertices), pass a BBox with left=right=x, top=bottom=y.
 *
 * @param excludeIds - objectIds to exclude from the guides (default: no exclusions)
 */
export const buildSnapFeedback = (
	actualBBox: BoundingBox,
	xResult: SnapAxisResult,
	yResult: SnapAxisResult,
	candidates: SnapCandidates,
	excludeIds: ReadonlySet<string> = NO_EXCLUDE,
): SnapFeedback => {
	// Include the center (midpoint) in the guides too. Draw a blue dashed line when the center matches a candidate.
	// For point snapping (left=right), it is absorbed by the Set deduplication inside collectAxisFeedbacks.
	const centerX = (actualBBox.left + actualBBox.right) / 2;
	const centerY = (actualBBox.top + actualBBox.bottom) / 2;
	return {
		x: xResult
			? collectAxisFeedbacks(
					[actualBBox.left, centerX, actualBBox.right],
					candidates.x,
					actualBBox.top,
					actualBBox.bottom,
					excludeIds,
				)
			: [],
		y: yResult
			? collectAxisFeedbacks(
					[actualBBox.top, centerY, actualBBox.bottom],
					candidates.y,
					actualBBox.left,
					actualBBox.right,
					excludeIds,
				)
			: [],
	};
};

/**
 * Compares an edge-value list with the snap candidates and returns the snap correction amount and per-axis snap results.
 * Generate the guide lines by passing the actual BBox to buildSnapFeedback.
 *
 * @param candidates - Snap candidates computed at dragStart (sorted ascending by coordinate)
 * @param thresholdSvg - Snap threshold (SVG coordinate units) = SNAP_THRESHOLD_PX / zoom
 * @param xEdgeValues - List of coordinate values to snap on the X axis. An empty array skips X-axis snapping
 * @param yEdgeValues - List of coordinate values to snap on the Y axis. An empty array skips Y-axis snapping
 * @param excludeIds - objectIds to exclude from snapping (e.g. the object being dragged; default: no exclusions)
 */
export const findSnap = (
	candidates: SnapCandidates,
	thresholdSvg: number,
	xEdgeValues: number[],
	yEdgeValues: number[],
	excludeIds: ReadonlySet<string> = NO_EXCLUDE,
): FindSnapResult => {
	const delta: SnapDelta = { x: 0, y: 0 };

	const xResult = findNearest(
		candidates.x,
		xEdgeValues,
		thresholdSvg,
		excludeIds,
	);
	const yResult = findNearest(
		candidates.y,
		yEdgeValues,
		thresholdSvg,
		excludeIds,
	);

	if (xResult) {
		delta.x = xResult.snapCoordinate - xResult.draggedEdgeValue;
	}
	if (yResult) {
		delta.y = yResult.snapCoordinate - yResult.draggedEdgeValue;
	}

	return { delta, xResult, yResult };
};
