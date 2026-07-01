import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Returns the connector-type IDs among rootIds in z-order (back to front).
 *
 * Connectors are managed mixed into rootIds rather than in a separate array, so
 * anywhere a "connector list" is needed derives it via this helper's type filter.
 */
export const getRootConnectorIds = (
	objects: Record<string, ObjectState>,
	rootIds: readonly string[],
): string[] => rootIds.filter((id) => objects[id]?.type === "connector");
