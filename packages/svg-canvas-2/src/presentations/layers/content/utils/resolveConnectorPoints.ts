import type { Point } from "@workspace/geometry";

import { adjustToOutline } from "./adjustToOutline";
import { resolveEndpoint } from "./resolveEndpoint";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";

/**
 * Pure function: Resolves connector endpoints to actual coordinates.
 * Handles both endpoint resolution and outline adjustment for center anchors.
 *
 * This function takes individual objects instead of the entire objects map,
 * enabling better memoization in React components.
 *
 * @param connectorState - The connector state to resolve
 * @param sourceObj - The source endpoint's owner object (or null if not found)
 * @param targetObj - The target endpoint's owner object (or null if not found)
 * @returns Resolved source and target points, or null if resolution fails
 */
export const resolveConnectorPoints = (
	connectorState: ConnectorState,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
): { source: Point; target: Point } | null => {
	// Resolve endpoints to coordinates
	let sourcePoint = resolveEndpoint(connectorState.source, sourceObj);
	let targetPoint = resolveEndpoint(connectorState.target, targetObj);

	if (!sourcePoint || !targetPoint) {
		return null;
	}

	// Adjust to outline for center anchors on rect/ellipse objects
	if (connectorState.source.anchor.kind === "center") {
		sourcePoint = adjustToOutline(sourcePoint, targetPoint, sourceObj);
		if (!sourcePoint) {
			return null;
		}
	}

	if (connectorState.target.anchor.kind === "center") {
		targetPoint = adjustToOutline(targetPoint, sourcePoint, targetObj);
		if (!targetPoint) {
			return null;
		}
	}

	return { source: sourcePoint, target: targetPoint };
};
