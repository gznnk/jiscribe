import { isSameOwnerGeometry, readOwnerGeometry } from "./readOwnerGeometry";
import type { OwnerGeometry } from "./readOwnerGeometry";
import { resolveConnectorPoints } from "./resolveConnectorPoints";
import type { ObjectAnchorRegionRegistry } from "../../rendering/objects/registry/ObjectAnchorRegionRegistry";
import type { ObjectExtraConnectPointsRegistry } from "../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectGeometryKeyRegistry } from "../../rendering/objects/registry/ObjectGeometryKeyRegistry";
import type { ObjectOutlineRegistry } from "../../rendering/objects/registry/ObjectOutlineRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connector/ConnectorState";

type OutlineRegistry = Pick<ObjectOutlineRegistry, "get">;
type AnchorRegionRegistry = Pick<ObjectAnchorRegionRegistry, "get">;
type ExtraConnectPointsRegistry = Pick<ObjectExtraConnectPointsRegistry, "get">;
type GeometryKeyRegistry = Pick<ObjectGeometryKeyRegistry, "get">;

type CacheEntry = {
	/** The source owner last asked about, kept so the same object skips reading its geometry again. */
	sourceObj: ObjectState | null | undefined;
	/** The geometry of the source owner the answer was resolved from. */
	sourceGeometry: OwnerGeometry;
	/** The target owner last asked about, kept so the same object skips reading its geometry again. */
	targetObj: ObjectState | null | undefined;
	/** The geometry of the target owner the answer was resolved from. */
	targetGeometry: OwnerGeometry;
	anchorRegionRegistry: AnchorRegionRegistry;
	extraConnectPointsRegistry: ExtraConnectPointsRegistry;
	geometryKeyRegistry: GeometryKeyRegistry;
	resolved: ReturnType<typeof resolveConnectorPoints>;
};

// Keyed on the outline registry so two canvases never share an answer; the other
// registries are checked on the entry.
const entriesByOutlineRegistry = new WeakMap<
	OutlineRegistry,
	WeakMap<ConnectorState, CacheEntry>
>();

/**
 * {@link resolveConnectorPoints} through all three geometry registries, handing
 * back the previous answer while the connector is the very object it was
 * resolved from and both owners keep the geometry it was resolved from
 * (readOwnerGeometry) — which is what lets viewport culling and the connector
 * renderer resolve a path once per change between them, and a style-only edit of
 * an owner reuse every route hanging off it.
 *
 * Only the latest answer per connector is kept, and it lives as long as the
 * connector object does.
 *
 * @param connectorState - The connector to resolve; its identity is the cache key
 * @param sourceObj - Owner of the source endpoint, compared by its geometry (readOwnerGeometry); null/undefined for a free endpoint or a missing owner
 * @param targetObj - Owner of the target endpoint, compared by its geometry (readOwnerGeometry); null/undefined for a free endpoint or a missing owner
 * @param outlineRegistry - Per-canvas ObjectOutlineRegistry; answers are never shared between two canvases
 * @param anchorRegionRegistry - Per-canvas ObjectAnchorRegionRegistry
 * @param extraConnectPointsRegistry - Per-canvas ObjectExtraConnectPointsRegistry
 * @param geometryKeyRegistry - Per-canvas ObjectGeometryKeyRegistry, read for the owners' state beyond their frame
 * @returns What resolveConnectorPoints returns, the same object as last time when nothing it reads has changed
 */
export const resolveConnectorPointsCached = (
	connectorState: ConnectorState,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
	outlineRegistry: OutlineRegistry,
	anchorRegionRegistry: AnchorRegionRegistry,
	extraConnectPointsRegistry: ExtraConnectPointsRegistry,
	geometryKeyRegistry: GeometryKeyRegistry,
): ReturnType<typeof resolveConnectorPoints> => {
	let entries = entriesByOutlineRegistry.get(outlineRegistry);
	if (entries === undefined) {
		entries = new WeakMap();
		entriesByOutlineRegistry.set(outlineRegistry, entries);
	}
	const entry = entries.get(connectorState);
	const isEntryUsable =
		entry !== undefined &&
		entry.anchorRegionRegistry === anchorRegionRegistry &&
		entry.extraConnectPointsRegistry === extraConnectPointsRegistry &&
		entry.geometryKeyRegistry === geometryKeyRegistry;
	const sourceGeometry =
		isEntryUsable && entry.sourceObj === sourceObj
			? entry.sourceGeometry
			: readOwnerGeometry(sourceObj, geometryKeyRegistry);
	const targetGeometry =
		isEntryUsable && entry.targetObj === targetObj
			? entry.targetGeometry
			: readOwnerGeometry(targetObj, geometryKeyRegistry);
	if (
		isEntryUsable &&
		isSameOwnerGeometry(entry.sourceGeometry, sourceGeometry) &&
		isSameOwnerGeometry(entry.targetGeometry, targetGeometry)
	) {
		// Moved onto the owners now in hand, so their next ask skips the read.
		entry.sourceObj = sourceObj;
		entry.targetObj = targetObj;
		return entry.resolved;
	}
	const resolved = resolveConnectorPoints(
		connectorState,
		sourceObj,
		targetObj,
		outlineRegistry,
		anchorRegionRegistry,
		extraConnectPointsRegistry,
	);
	entries.set(connectorState, {
		sourceObj,
		sourceGeometry,
		targetObj,
		targetGeometry,
		anchorRegionRegistry,
		extraConnectPointsRegistry,
		geometryKeyRegistry,
		resolved,
	});
	return resolved;
};
