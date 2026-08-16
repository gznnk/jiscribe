import type { Point, TransformedFrame } from "@jiscribe/geometry";
import { useMemo } from "react";

import { resolveConnectorPoints } from "../../../../domain/state/connector/endpoints";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import { useObjectAnchorRegionRegistry } from "../../../objects/registry/ObjectAnchorRegionRegistryContext";
import { useObjectExtraConnectPointsRegistry } from "../../../objects/registry/ObjectExtraConnectPointsRegistryContext";
import type { ObjectGeometryKeyRegistry } from "../../../objects/registry/ObjectGeometryKeyRegistry";
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
 * The fields the route resolution actually reads from an endpoint owner, as one
 * value per field for the memo's dependency list. Non-geometry edits (fill /
 * text / ...) clone the owner but keep these values, so keying the memo on them
 * skips the re-route (#214).
 * Connectable types are all frame-based today; if poly shapes ever become
 * connectable, `points` must be added here. Per-type state beyond the frame
 * (a callout's tail) arrives as `geometryKey`, so a type whose silhouette moves
 * on its own stays live by registering one.
 */
const getOwnerGeometryDeps = (
	obj: ObjectState | null,
	geometryKeyRegistry: ObjectGeometryKeyRegistry,
) => {
	const frame = obj as (ObjectState & Partial<TransformedFrame>) | null;
	return {
		id: obj?.id,
		type: obj?.type,
		features: obj?.features,
		cx: frame?.cx,
		cy: frame?.cy,
		width: frame?.width,
		height: frame?.height,
		rotation: frame?.rotation,
		scaleX: frame?.scaleX,
		scaleY: frame?.scaleY,
		geometryKey: obj ? geometryKeyRegistry.get(obj.type)?.(obj) : undefined,
	};
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
	const source = getOwnerGeometryDeps(sourceObj, geometryKeyRegistry);
	const target = getOwnerGeometryDeps(targetObj, geometryKeyRegistry);
	return useMemo(() => {
		const resolved = resolveConnectorPoints(
			connectorState,
			sourceObj,
			targetObj,
			outlineRegistry,
			anchorRegionRegistry,
			extraConnectPointsRegistry,
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
