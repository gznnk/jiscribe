import type { EndpointRef } from "../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";

/**
 * Resolves a connector endpoint's owner shape from the objects map.
 *
 * Extracting the owner here (rather than passing the whole objects map to
 * downstream resolution) keeps the returned object identity stable across
 * commits that touch unrelated objects, which the memoized connector renderers
 * rely on.
 *
 * Centralizing this idiom keeps every consumer (ConnectorRenderer via
 * ObjectsRenderer, ConnectorControls, PendingConnectorOverlay) in lockstep:
 * if the owner-resolution rule changes (group-aware resolution, dangling owner
 * id handling, ...), it changes in one place instead of drifting per site.
 *
 * @param objects - Normalized objects map, keyed by id
 * @param endpoint - The endpoint reference whose owner to resolve
 * @returns The owner shape, or null if the endpoint is free (unowned) or the
 *   referenced owner id is not present in the map (dangling)
 */
export const resolveEndpointOwner = (
	objects: Record<string, ObjectState>,
	endpoint: EndpointRef,
): ObjectState | null => {
	const ownerId = endpoint.owner?.id;
	return ownerId ? (objects[ownerId] ?? null) : null;
};
