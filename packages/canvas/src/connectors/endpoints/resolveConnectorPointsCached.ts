import { resolveConnectorPoints } from "./resolveConnectorPoints";
import type { ObjectAnchorRegionRegistry } from "../../rendering/objects/registry/ObjectAnchorRegionRegistry";
import type { ObjectExtraConnectPointsRegistry } from "../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectOutlineRegistry } from "../../rendering/objects/registry/ObjectOutlineRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connector/ConnectorState";

type OutlineRegistry = Pick<ObjectOutlineRegistry, "get">;
type AnchorRegionRegistry = Pick<ObjectAnchorRegionRegistry, "get">;
type ExtraConnectPointsRegistry = Pick<ObjectExtraConnectPointsRegistry, "get">;

type CacheEntry = {
	sourceObj: ObjectState | null | undefined;
	targetObj: ObjectState | null | undefined;
	anchorRegionRegistry: AnchorRegionRegistry;
	extraConnectPointsRegistry: ExtraConnectPointsRegistry;
	resolved: ReturnType<typeof resolveConnectorPoints>;
};

// Keyed on the outline registry so two canvases never share an answer; the other
// two registries are checked on the entry.
const entriesByOutlineRegistry = new WeakMap<
	OutlineRegistry,
	WeakMap<ConnectorState, CacheEntry>
>();

/**
 * {@link resolveConnectorPoints} through all three geometry registries, handing
 * back the previous answer while the connector and both owners are the very
 * objects it was resolved from — which is what lets viewport culling and the
 * connector renderer resolve a path once per change between them.
 *
 * Only the latest answer per connector is kept, and it lives as long as the
 * connector object does.
 *
 * @param connectorState - The connector to resolve; its identity is the cache key
 * @param sourceObj - Owner of the source endpoint, compared by identity; null/undefined for a free endpoint or a missing owner
 * @param targetObj - Owner of the target endpoint, compared by identity; null/undefined for a free endpoint or a missing owner
 * @param outlineRegistry - Per-canvas ObjectOutlineRegistry; answers are never shared between two canvases
 * @param anchorRegionRegistry - Per-canvas ObjectAnchorRegionRegistry
 * @param extraConnectPointsRegistry - Per-canvas ObjectExtraConnectPointsRegistry
 * @returns What resolveConnectorPoints returns, the same object as last time when nothing it read was replaced
 */
export const resolveConnectorPointsCached = (
	connectorState: ConnectorState,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
	outlineRegistry: OutlineRegistry,
	anchorRegionRegistry: AnchorRegionRegistry,
	extraConnectPointsRegistry: ExtraConnectPointsRegistry,
): ReturnType<typeof resolveConnectorPoints> => {
	let entries = entriesByOutlineRegistry.get(outlineRegistry);
	if (entries === undefined) {
		entries = new WeakMap();
		entriesByOutlineRegistry.set(outlineRegistry, entries);
	}
	const entry = entries.get(connectorState);
	if (
		entry !== undefined &&
		entry.sourceObj === sourceObj &&
		entry.targetObj === targetObj &&
		entry.anchorRegionRegistry === anchorRegionRegistry &&
		entry.extraConnectPointsRegistry === extraConnectPointsRegistry
	) {
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
		targetObj,
		anchorRegionRegistry,
		extraConnectPointsRegistry,
		resolved,
	});
	return resolved;
};
