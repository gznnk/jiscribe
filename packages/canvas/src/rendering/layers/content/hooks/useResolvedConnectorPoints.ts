import type { Point } from "@jiscribe/geometry";
import { useMemo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";
import {
	listConnectorPathPoints,
	readOwnerGeometry,
	resolveConnectorPointsCached,
} from "../../../objects/connector/geometry/endpoints";
import { useObjectAnchorRegionRegistry } from "../../../objects/registry/ObjectAnchorRegionRegistryContext";
import { useObjectExtraConnectPointsRegistry } from "../../../objects/registry/ObjectExtraConnectPointsRegistryContext";
import { useObjectGeometryKeyRegistry } from "../../../objects/registry/ObjectGeometryKeyRegistryContext";
import { useObjectOutlineRegistry } from "../../../objects/registry/ObjectOutlineRegistryContext";

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
	const outlineRegistry = useObjectOutlineRegistry();
	const anchorRegionRegistry = useObjectAnchorRegionRegistry();
	const extraConnectPointsRegistry = useObjectExtraConnectPointsRegistry();
	const geometryKeyRegistry = useObjectGeometryKeyRegistry();

	// Keyed on the values the resolution reads (connector endpoints / routing and
	// the owners' geometry) instead of the object references: property edits clone
	// the connector and the owners without changing geometry (#214). The owners'
	// values are listed field by field — the dependency list must stay an array
	// literal for the react-hooks rules to check it.
	const source = readOwnerGeometry(sourceObj, geometryKeyRegistry);
	const target = readOwnerGeometry(targetObj, geometryKeyRegistry);
	return useMemo(() => {
		// Cached, so a path viewport culling resolved for the same objects this
		// render is not routed again (calcVisibleObjectIds).
		const resolved = resolveConnectorPointsCached(
			connectorState,
			sourceObj,
			targetObj,
			outlineRegistry,
			anchorRegionRegistry,
			extraConnectPointsRegistry,
			geometryKeyRegistry,
		);
		if (!resolved) {
			return null;
		}
		return {
			source: resolved.source,
			target: resolved.target,
			points: listConnectorPathPoints(resolved),
		};
		/* eslint-disable react-hooks/exhaustive-deps */
	}, [
		connectorState.source,
		connectorState.target,
		connectorState.points,
		connectorState.routing,
		source.id,
		source.type,
		source.features,
		source.cx,
		source.cy,
		source.width,
		source.height,
		source.rotation,
		source.scaleX,
		source.scaleY,
		source.geometryKey,
		target.id,
		target.type,
		target.features,
		target.cx,
		target.cy,
		target.width,
		target.height,
		target.rotation,
		target.scaleX,
		target.scaleY,
		target.geometryKey,
		outlineRegistry,
		anchorRegionRegistry,
		extraConnectPointsRegistry,
		geometryKeyRegistry,
	]);
	/* eslint-enable react-hooks/exhaustive-deps */
};
