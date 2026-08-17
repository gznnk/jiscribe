import { isSameEndpoint } from "../../../../../../schemas/objects/types/EndpointRef";
import type { ConnectorState } from "../../../../../../states/objects/connector/ConnectorState";

/**
 * Determines whether two connectors have equal endpoints (source / target) and
 * intermediate waypoints.
 * Used to detect no-op edits where an anchor was grabbed and dropped back at its
 * original position.
 */
export function isSameConnectorEndpoints(
	srcConnector: ConnectorState,
	clonedConnector: ConnectorState,
): boolean {
	if (!isSameEndpoint(srcConnector.source, clonedConnector.source)) {
		return false;
	}
	if (!isSameEndpoint(srcConnector.target, clonedConnector.target)) {
		return false;
	}

	const srcPoints = srcConnector.points;
	const clonedPoints = clonedConnector.points;
	if (srcPoints.length !== clonedPoints.length) {
		return false;
	}
	return srcPoints.every(
		(p, i) => p.x === clonedPoints[i].x && p.y === clonedPoints[i].y,
	);
}
