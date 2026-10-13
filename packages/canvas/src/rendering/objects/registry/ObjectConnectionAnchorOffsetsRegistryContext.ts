import { createContext, useContext } from "react";

import {
	type ObjectConnectionAnchorOffsetsRegistry,
	createObjectConnectionAnchorOffsetsRegistry,
} from "./ObjectConnectionAnchorOffsetsRegistry";

/**
 * Rendering-layer context that distributes the per-canvas
 * `ObjectConnectionAnchorOffsetsRegistry` to the connection-anchor dots (handed
 * down separately from the controllers-layer bundle for the same reason as
 * ObjectTextRegionRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider falls
 * back to the theme's anchor distance. `Canvas` always provides the canvas's
 * own registry.
 */
export const ObjectConnectionAnchorOffsetsRegistryContext =
	createContext<ObjectConnectionAnchorOffsetsRegistry>(
		createObjectConnectionAnchorOffsetsRegistry(),
	);

/**
 * Retrieves the `ObjectConnectionAnchorOffsetsRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectConnectionAnchorOffsetsRegistry(): ObjectConnectionAnchorOffsetsRegistry {
	return useContext(ObjectConnectionAnchorOffsetsRegistryContext);
}
