import { createContext, useContext } from "react";

import { type OutlineRegistry, createOutlineRegistry } from "./OutlineRegistry";

/**
 * Presentation-layer context that distributes the per-canvas
 * `OutlineRegistry` to the connector renderer and connection-anchor dots
 * (handed down separately from the controllers-layer bundle for the same reason
 * as TextRegionRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider falls
 * back to bounding-box outlines. `Canvas` and `CanvasThumbnail` always provide
 * the canvas's own registry.
 */
export const OutlineRegistryContext = createContext<OutlineRegistry>(
	createOutlineRegistry(),
);

/**
 * Retrieves the `OutlineRegistry` for the surrounding `<Canvas>`.
 */
export function useOutlineRegistry(): OutlineRegistry {
	return useContext(OutlineRegistryContext);
}
