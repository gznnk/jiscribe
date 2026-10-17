import { createContext, useContext } from "react";

import {
	type ObjectConnectionAnchorsRegistry,
	createObjectConnectionAnchorsRegistry,
} from "./ObjectConnectionAnchorsRegistry";

/**
 * Rendering-layer context that distributes the per-canvas
 * `ObjectConnectionAnchorsRegistry` to the connection-anchor dots (handed down
 * separately from the controllers-layer bundle for the same reason as
 * ObjectTextRegionRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider offers
 * every anchor at the theme's distance. `Canvas` always provides the canvas's
 * own registry.
 */
export const ObjectConnectionAnchorsRegistryContext =
	createContext<ObjectConnectionAnchorsRegistry>(
		createObjectConnectionAnchorsRegistry(),
	);

/**
 * Retrieves the `ObjectConnectionAnchorsRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectConnectionAnchorsRegistry(): ObjectConnectionAnchorsRegistry {
	return useContext(ObjectConnectionAnchorsRegistryContext);
}
