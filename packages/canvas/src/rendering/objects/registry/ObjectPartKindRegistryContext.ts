import { createContext, useContext } from "react";

import {
	type ObjectPartKindRegistry,
	createObjectPartKindRegistry,
} from "./ObjectPartKindRegistry";

/**
 * Rendering-layer context that distributes the per-canvas
 * `ObjectPartKindRegistry` to the shape renderers that place text slots
 * (calcTextRegion; handed down separately from the controllers-layer bundle for
 * the same reason as ObjectComponentRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider falls
 * back to full-bbox text regions. `Canvas` always provides the canvas's own
 * registry.
 */
export const ObjectPartKindRegistryContext =
	createContext<ObjectPartKindRegistry>(createObjectPartKindRegistry());

/**
 * Retrieves the `ObjectPartKindRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectPartKindRegistry(): ObjectPartKindRegistry {
	return useContext(ObjectPartKindRegistryContext);
}
