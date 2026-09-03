import { createContext, useContext } from "react";

import {
	type ObjectAnchorRegionRegistry,
	createObjectAnchorRegionRegistry,
} from "./ObjectAnchorRegionRegistry";

/**
 * Rendering-layer context that distributes the per-canvas
 * `ObjectAnchorRegionRegistry` to the connector renderer and connection-anchor
 * dots (handed down separately from the controllers-layer bundle for the same
 * reason as ObjectTextRegionRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider falls
 * back to bounding-box anchor regions. `Canvas` and `CanvasThumbnail` always
 * provide the canvas's own registry.
 */
export const ObjectAnchorRegionRegistryContext =
	createContext<ObjectAnchorRegionRegistry>(createObjectAnchorRegionRegistry());

/**
 * Retrieves the `ObjectAnchorRegionRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectAnchorRegionRegistry(): ObjectAnchorRegionRegistry {
	return useContext(ObjectAnchorRegionRegistryContext);
}
