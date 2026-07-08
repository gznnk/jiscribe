import type { Point } from "@workspace/geometry";

import { elbowCandidates } from "./elbowCandidates";
import { calcPathSignature } from "./pathSignature";
import {
	calcRouteCost,
	compareRouteChoices,
	type RouteChoice,
} from "./routeCost";
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
 * The spec (what a correct route is, and the priority order between competing properties) is in
 * `SPEC.md` in this folder; it is verified by the config-space sweep in `__tests__/routingInvariants.test.ts`.
 *
 * Algorithm overview (each step is split into a module in the same folder):
 * 1. `stubPoint`: create a **stub** by pushing each endpoint out along its exit direction
 *    (AABB edge + margin, so it reliably exits the bounding box even for rotated shapes).
 * 2. `elbowCandidates`: enumerate **elbow candidates** connecting the stubs from bend-position
 *    "channels" (both stub ends, the center between the two shapes, and each box's perimeter ± margin).
 *    The centered channel represents S/Z shapes; the box-perimeter channels represent wrapping around shapes.
 * 3. `calcRouteCost` / `compareRouteChoices`: evaluate each candidate under a **total order** and
 *    pick the best: shape crossings → aesthetics (turns×weight + length + reversals×penalty) →
 *    symmetric (centered crossover) → topology signature → concrete path. The trailing intrinsic keys make the
 *    result independent of candidate enumeration order, so cost-tied shapes (e.g. wrapping over
 *    vs. under equal-sized boxes) do not flip while an owner shape is dragged (route stability
 *    without memory).
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
	// Enumerate orthogonal elbow candidates connecting the stubs. The candidate bending at the center
	// between the two shapes is flagged `symmetric`, so it is preferred among cost-equal candidates.
	const candidates = elbowCandidates(
		sourceStub,
		targetStub,
		source.box,
		target.box,
		margin,
	);

	// ── Step 3: evaluate and pick the best ──
	// Compare candidates under the total order compareRouteChoices (crossings → aesthetics →
	// intrinsic tie-breaking keys). Ties are decided by the route's own shape, never by
	// enumeration order, so the result is stable while the shapes move (see routeCost).
	let best: RouteChoice | null = null;
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
		const choice: RouteChoice = {
			cost: calcRouteCost(fullPath, simplifiedElbow, source, target, margin),
			symmetric,
			signature: calcPathSignature(fullPath),
			path: fullPath,
		};
		if (!best || compareRouteChoices(choice, best) < 0) {
			best = choice;
		}
	}

	// If candidates are empty (theoretically impossible, but defensively), return a simple direct stub connection.
	return (
		best?.path ??
		simplifyPath([source.point, sourceStub, targetStub, target.point])
	);
};
