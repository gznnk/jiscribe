import { createContext, useContext } from "react";

import {
	type TextRegionRegistry,
	createTextRegionRegistry,
} from "./TextRegionRegistry";

/**
 * Presentation-layer context that distributes the per-canvas
 * `TextRegionRegistry` to shape renderers (handed down separately from the
 * controllers-layer bundle for the same reason as ObjectComponentRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider falls
 * back to full-bbox text regions. `Canvas` and `CanvasThumbnail` always provide
 * the canvas's own registry.
 */
export const TextRegionRegistryContext = createContext<TextRegionRegistry>(
	createTextRegionRegistry(),
);

/**
 * Retrieves the `TextRegionRegistry` for the surrounding `<Canvas>`.
 */
export function useTextRegionRegistry(): TextRegionRegistry {
	return useContext(TextRegionRegistryContext);
}
