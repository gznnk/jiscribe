import type { Point } from "@workspace/geometry";
import { useMemo } from "react";

import type { CanvasState } from "../../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import { resolveConnectorPoints } from "../utils/endpoints";

/**
 * Resolved connector coordinates.
 *
 * `source` / `target` are the endpoints (owned anchors are outline-adjusted).
 * `points` is the point list for polyline rendering, ordered `source → ...waypoints → target`
 * (`points[0]` is `source`, the last entry is `target`). The intermediate waypoints are folded
 * into `points`, so they are not exposed separately.
 */
export type ResolvedConnectorPoints = {
	source: Point;
	target: Point;
	points: Point[];
};

/**
 * Custom hook: Resolves connector endpoints with optimized memoization.
 *
 * This hook extracts only the necessary objects (source and target) from the objects map,
 * so the memoization only re-runs when those specific objects change, not when any object
 * in the canvas changes.
 *
 * The polyline point list `points` (source → ...waypoints → target) is assembled and
 * returned inside the same useMemo. This keeps the `points` reference stable so the
 * memoized `Connector` does not re-render on unrelated redraws (matching the behavior
 * from when endpoints were passed as scalars).
 *
 * @param connectorState - The connector state to resolve
 * @param objects - Map of all objects in the canvas
 * @returns Resolved endpoints and the assembled point list, or null if resolution fails
 */
export const useResolvedConnectorPoints = (
	connectorState: ConnectorState,
	objects: CanvasState["objects"],
): ResolvedConnectorPoints | null => {
	// Extract only the objects we need for this connector
	const sourceObjId = connectorState.source.owner?.id ?? null;
	const targetObjId = connectorState.target.owner?.id ?? null;

	const sourceObj = sourceObjId ? objects[sourceObjId] : null;
	const targetObj = targetObjId ? objects[targetObjId] : null;

	// Memoize based on connector state and the specific objects it references
	// This avoids re-calculation when unrelated objects change
	return useMemo(() => {
		const resolved = resolveConnectorPoints(
			connectorState,
			sourceObj,
			targetObj,
		);
		if (!resolved) {
			return null;
		}
		return {
			source: resolved.source,
			target: resolved.target,
			points: [resolved.source, ...resolved.waypoints, resolved.target],
		};
	}, [connectorState, sourceObj, targetObj]);
};
