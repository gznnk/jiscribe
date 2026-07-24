import { createContext, useContext } from "react";

import {
	type ObjectTextRegionRegistry,
	createObjectTextRegionRegistry,
} from "./ObjectTextRegionRegistry";

/**
 * Presentation-layer context that distributes the per-canvas
 * `ObjectTextRegionRegistry` to shape renderers (handed down separately from the
 * controllers-layer bundle for the same reason as ObjectComponentRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider falls
 * back to full-bbox text regions. `Canvas` and `CanvasThumbnail` always provide
 * the canvas's own registry.
 */
export const ObjectTextRegionRegistryContext =
	createContext<ObjectTextRegionRegistry>(createObjectTextRegionRegistry());

/**
 * Retrieves the `ObjectTextRegionRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectTextRegionRegistry(): ObjectTextRegionRegistry {
	return useContext(ObjectTextRegionRegistryContext);
}
