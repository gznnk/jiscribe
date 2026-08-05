import { createContext, useContext } from "react";

import {
	type ObjectExtraConnectPointsRegistry,
	createObjectExtraConnectPointsRegistry,
} from "./ObjectExtraConnectPointsRegistry";

/**
 * Presentation-layer context that distributes the per-canvas
 * `ObjectExtraConnectPointsRegistry` to the connector renderer and
 * connection-anchor dots (handed down separately from the controllers-layer
 * bundle for the same reason as ObjectTextRegionRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider offers
 * only the four edge midpoints. `Canvas` and `CanvasThumbnail` always provide
 * the canvas's own registry.
 */
export const ObjectExtraConnectPointsRegistryContext =
	createContext<ObjectExtraConnectPointsRegistry>(
		createObjectExtraConnectPointsRegistry(),
	);

/**
 * Retrieves the `ObjectExtraConnectPointsRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectExtraConnectPointsRegistry(): ObjectExtraConnectPointsRegistry {
	return useContext(ObjectExtraConnectPointsRegistryContext);
}
