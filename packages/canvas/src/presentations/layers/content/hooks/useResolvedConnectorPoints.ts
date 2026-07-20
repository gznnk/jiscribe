import type { Point, TransformedFrame } from "@workspace/geometry";
import { useMemo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import { useOutlineRegistry } from "../../../objects/registry/OutlineRegistryContext";
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
 * Fixed-length dependency tuple of the fields the route resolution actually
 * reads from an endpoint owner. Non-geometry edits (fill / text / ...) clone
 * the owner but keep these values, so keying the memo on them skips the
 * re-route (#214).
 * Connectable types are all frame-based today; if poly shapes ever become
 * connectable, `points` must be added here.
 */
const getOwnerGeometryDeps = (obj: ObjectState | null) => {
	const frame = obj as (ObjectState & Partial<TransformedFrame>) | null;
	return [
		obj?.id,
		obj?.type,
		obj?.features,
		frame?.cx,
		frame?.cy,
		frame?.width,
		frame?.height,
		frame?.rotation,
		frame?.scaleX,
		frame?.scaleY,
	] as const;
};

/**
 * Custom hook: Resolves connector endpoints with optimized memoization.
 *
 * Takes the source/target owner objects directly (the caller extracts them from the
 * objects map), and the memoization is keyed on the geometry values the resolution
 * reads — not the object references — so it only re-runs when the route can actually
 * change, not on non-geometry edits or unrelated canvas changes.
 *
 * The polyline point list `points` (source → ...waypoints → target) is assembled and
 * returned inside the same useMemo. This keeps the `points` reference stable so the
 * memoized `Connector` does not re-render on unrelated redraws (matching the behavior
 * from when endpoints were passed as scalars).
 *
 * @param connectorState - The connector state to resolve
 * @param sourceObj - Owner shape of the source endpoint. null if unreferenced (free endpoint) or not found
 * @param targetObj - Owner shape of the target endpoint. null if unreferenced (free endpoint) or not found
 * @returns Resolved endpoints and the assembled point list, or null if resolution fails
 */
export const useResolvedConnectorPoints = (
	connectorState: ConnectorState,
	sourceObj: ObjectState | null,
	targetObj: ObjectState | null,
): ResolvedConnectorPoints | null => {
	const outlineRegistry = useOutlineRegistry();

	// Keyed on the values the resolution reads (connector endpoints / routing and
	// the owners' geometry) instead of the object references: property edits clone
	// the connector and the owners without changing geometry (#214).
	return useMemo(() => {
		const resolved = resolveConnectorPoints(
			connectorState,
			sourceObj,
			targetObj,
			outlineRegistry,
		);
		if (!resolved) {
			return null;
		}
		return {
			source: resolved.source,
			target: resolved.target,
			points: [resolved.source, ...resolved.waypoints, resolved.target],
		};
		/* eslint-disable react-hooks/exhaustive-deps */
	}, [
		connectorState.source,
		connectorState.target,
		connectorState.points,
		connectorState.routing,
		...getOwnerGeometryDeps(sourceObj),
		...getOwnerGeometryDeps(targetObj),
		outlineRegistry,
	]);
	/* eslint-enable react-hooks/exhaustive-deps */
};
