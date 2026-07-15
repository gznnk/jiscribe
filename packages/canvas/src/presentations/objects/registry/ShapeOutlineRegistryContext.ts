import { createContext, useContext } from "react";

import {
	type ShapeOutlineRegistry,
	createShapeOutlineRegistry,
} from "./ShapeOutlineRegistry";

/**
 * Presentation-layer context that distributes the per-canvas
 * `ShapeOutlineRegistry` to the connector renderer and connection-anchor dots
 * (handed down separately from the controllers-layer bundle for the same reason
 * as TextRegionRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider falls
 * back to bounding-box outlines. `Canvas` and `CanvasThumbnail` always provide
 * the canvas's own registry.
 */
export const ShapeOutlineRegistryContext = createContext<ShapeOutlineRegistry>(
	createShapeOutlineRegistry(),
);

/**
 * Retrieves the `ShapeOutlineRegistry` for the surrounding `<Canvas>`.
 */
export function useShapeOutlineRegistry(): ShapeOutlineRegistry {
	return useContext(ShapeOutlineRegistryContext);
}
