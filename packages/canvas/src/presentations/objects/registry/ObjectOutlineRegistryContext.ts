import { createContext, useContext } from "react";

import {
	type ObjectOutlineRegistry,
	createObjectOutlineRegistry,
} from "../../../domain/state/registry/ObjectOutlineRegistry";

/**
 * Presentation-layer context that distributes the per-canvas
 * `ObjectOutlineRegistry` to the connector renderer and connection-anchor dots
 * (handed down separately from the controllers-layer bundle for the same reason
 * as ObjectTextRegionRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider falls
 * back to bounding-box outlines. `Canvas` and `CanvasThumbnail` always provide
 * the canvas's own registry.
 */
export const ObjectOutlineRegistryContext =
	createContext<ObjectOutlineRegistry>(createObjectOutlineRegistry());

/**
 * Retrieves the `ObjectOutlineRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectOutlineRegistry(): ObjectOutlineRegistry {
	return useContext(ObjectOutlineRegistryContext);
}
