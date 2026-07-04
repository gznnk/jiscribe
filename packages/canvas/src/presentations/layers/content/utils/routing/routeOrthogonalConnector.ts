import type { Point } from "@workspace/geometry";

import { directionsFace, elbowCandidates } from "./elbowCandidates";
import { calcPathSignature } from "./pathSignature";
import { calcRouteCost, compareCost, type RouteCost } from "./routeCost";
import { simplifyPath } from "./simplifyPath";
import { clampStubMargin, stubPoint } from "./stub";
import type {
	OrthogonalConnectorEndpoint,
	RouteOrthogonalConnectorOptions,
} from "./types";
import { DEFAULT_CONNECTOR_MARGIN } from "../../../../../constants/connectorRouting";

/**
 * Generates an orthogonal route connecting two endpoints using only horizontal/vertical segments.
 *
 * Algorithm overview (each step is split into a module in the same folder):
 * 1. `stubPoint`: create a **stub** by pushing each endpoint out along its exit direction
 *    (AABB edge + margin, so it reliably exits the bounding box even for rotated shapes).
 * 2. `elbowCandidates`: enumerate **elbow candidates** connecting the stubs from bend-position
 *    "channels" (both stub ends, the midpoint, and each box's perimeter ± margin). The midpoint
 *    channel represents S/Z shapes; the box-perimeter channels represent wrapping around shapes.
 * 3. `calcRouteCost` / `compareCost`: evaluate each candidate **lexicographically** and pick the best:
 *    shape crossings → aesthetics (turns×weight + length + reversals×penalty − symmetry bonus).
 *    When `options.previousPathSignature` is given, the candidate matching the previous frame's
 *    topology gets a hysteresis bonus, so cost-tied shapes do not flip while an owner is dragged.
 *
 * The return value is the full path including endpoints `[source.point, …, target.point]`
 * (collinear/duplicate points already collapsed).
 * Only the shapes at **both ends** are avoided; other shapes in between are not considered (v1).
 *
 * Not supported / room for future extension:
 * - **Rounded / curved rendering** (equivalent to Rounded / Curve of `pathType`). This
 *   implementation only produces right-angle corners. Corner rendering style is deferred as a separate feature.
 *
 * @param source - The source endpoint (coordinate, outward direction, AABB to avoid)
 * @param target - The target endpoint (coordinate, outward direction, AABB to avoid)
 * @param options - Tuning options such as margin (stub length, px). Defaults to DEFAULT_CONNECTOR_MARGIN
 * @returns The orthogonal full path including endpoints `[source.point, …, target.point]` (collinear/duplicate points already collapsed)
 */
export const routeOrthogonalConnector = (
	source: OrthogonalConnectorEndpoint,
	target: OrthogonalConnectorEndpoint,
	options: RouteOrthogonalConnectorOptions = {},
): Point[] => {
	const margin = options.margin ?? DEFAULT_CONNECTOR_MARGIN;

	// ── Step 1: stubs ──
	// The point obtained by pushing each endpoint out by margin along its exit direction. The line
	// always passes through this stub, entering/exiting the shape face orthogonally. Only endpoints
	// with a shape emit a stub (free endpoints connect from their position).
	//
	// In close facing layouts, a full-margin stub overshoots the other side and causes a wasteful
	// wrap-around, so the stub length is shortened based on the forward distance to the other endpoint
	// (clampStubMargin). Channel computation (elbowCandidates) uses the unshortened margin to keep the
	// expressiveness of wrap-around routes.
	const sourceMargin = clampStubMargin(
		source.point,
		source.direction,
		target.point,
		margin,
	);
	const targetMargin = clampStubMargin(
		target.point,
		target.direction,
		source.point,
		margin,
	);
	const sourceStub = source.box
		? stubPoint(source.point, source.direction, source.box, sourceMargin)
		: source.point;
	const targetStub = target.box
		? stubPoint(target.point, target.direction, target.box, targetMargin)
		: target.point;

	// ── Step 2: candidate generation ──
	// Enumerate orthogonal elbow candidates connecting the stubs. For facing layouts, to prefer a
	// midpoint bend (S shape), pass that axis (x/y) to candidate generation as `facing`.
	const facing = directionsFace(source.direction, target.direction);
	const candidates = elbowCandidates(
		sourceStub,
		targetStub,
		source.box,
		target.box,
		margin,
		facing.x,
		facing.y,
	);

	// ── Step 3: evaluate and pick the best ──
	// Compare costs lexicographically via compareCost (crossings → aesthetics).
	const previousPathSignature = options.previousPathSignature ?? null;
	let bestPath: Point[] | null = null;
	let bestCost: RouteCost | null = null;
	for (const { elbow, symmetric } of candidates) {
		// simplifyPath is called twice because the inputs differ:
		// - simplifiedElbow: excludes the stub legs (crossing detection excludes the stub legs).
		// - fullPath: includes the stub legs (turn count and length are measured on the line actually drawn).
		const simplifiedElbow = simplifyPath(elbow);
		const fullPath = simplifyPath([
			source.point,
			...simplifiedElbow,
			target.point,
		]);
		const matchesPreviousRoute =
			previousPathSignature !== null &&
			calcPathSignature(fullPath) === previousPathSignature;
		const cost = calcRouteCost(
			fullPath,
			simplifiedElbow,
			source.box,
			target.box,
			symmetric,
			matchesPreviousRoute,
		);
		// Since the comparison is strict, on equal cost the earlier-evaluated candidate is kept.
		// Candidates are ordered x channels (horizontal-start H→V→H) → y channels, so on a perfect
		// tie the horizontal-start one is preferred (deterministic but arbitrary).
		if (!bestCost || compareCost(cost, bestCost) < 0) {
			bestCost = cost;
			bestPath = fullPath;
		}
	}

	// If candidates are empty (theoretically impossible, but defensively), return a simple direct stub connection.
	return (
		bestPath ??
		simplifyPath([source.point, sourceStub, targetStub, target.point])
	);
};
