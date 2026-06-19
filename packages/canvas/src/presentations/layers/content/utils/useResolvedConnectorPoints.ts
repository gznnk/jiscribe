import type { Point } from "@workspace/geometry";
import { useMemo } from "react";

import { resolveConnectorPoints } from "./resolveConnectorPoints";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";

/**
 * Custom hook: Resolves connector endpoints with optimized memoization.
 *
 * This hook extracts only the necessary objects (source and target) from the objects map,
 * so the memoization only re-runs when those specific objects change, not when any object
 * in the canvas changes.
 *
 * @param connectorState - The connector state to resolve
 * @param objects - Map of all objects in the canvas
 * @returns Resolved source and target points, or null if resolution fails
 */
export const useResolvedConnectorPoints = (
	connectorState: ConnectorState,
	objects: CanvasState["objects"],
): { source: Point; target: Point } | null => {
	// Extract only the objects we need for this connector
	const sourceObjId = connectorState.source.owner?.id ?? null;
	const targetObjId = connectorState.target.owner?.id ?? null;

	const sourceObj = sourceObjId ? objects[sourceObjId] : null;
	const targetObj = targetObjId ? objects[targetObjId] : null;

	// Memoize based on connector state and the specific objects it references
	// This avoids re-calculation when unrelated objects change
	return useMemo(
		() => resolveConnectorPoints(connectorState, sourceObj, targetObj),
		[connectorState, sourceObj, targetObj],
	);
};
