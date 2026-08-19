import { createContext, useContext } from "react";

import {
	type ObjectGeometryKeyRegistry,
	createObjectGeometryKeyRegistry,
} from "./ObjectGeometryKeyRegistry";

/**
 * Rendering-layer context that distributes the per-canvas
 * `ObjectGeometryKeyRegistry` to the connector endpoint memo (handed down
 * separately from the controllers-layer bundle for the same reason as
 * ObjectTextRegionRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider keys
 * the memo on the frame fields alone. `Canvas` and `CanvasThumbnail` always
 * provide the canvas's own registry.
 */
export const ObjectGeometryKeyRegistryContext =
	createContext<ObjectGeometryKeyRegistry>(createObjectGeometryKeyRegistry());

/**
 * Retrieves the `ObjectGeometryKeyRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectGeometryKeyRegistry(): ObjectGeometryKeyRegistry {
	return useContext(ObjectGeometryKeyRegistryContext);
}
