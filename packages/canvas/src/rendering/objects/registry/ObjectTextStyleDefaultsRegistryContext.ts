import {
	type ObjectTextStyleDefaultsRegistry,
	createObjectTextStyleDefaultsRegistry,
} from "@jiscribe/doc/plugin/ObjectTextStyleDefaultsRegistry";
import { createContext, useContext } from "react";

/**
 * Rendering-layer context that distributes the per-canvas
 * `ObjectTextStyleDefaultsRegistry` to shape renderers (handed down separately
 * from the controllers-layer bundle for the same reason as
 * ObjectComponentRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider draws
 * every unset text style with the shared last resort (TEXT_STYLE_FALLBACK).
 * `Canvas` and `CanvasThumbnail` always provide the canvas's own registry.
 */
export const ObjectTextStyleDefaultsRegistryContext =
	createContext<ObjectTextStyleDefaultsRegistry>(
		createObjectTextStyleDefaultsRegistry(),
	);

/**
 * Retrieves the `ObjectTextStyleDefaultsRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectTextStyleDefaultsRegistry(): ObjectTextStyleDefaultsRegistry {
	return useContext(ObjectTextStyleDefaultsRegistryContext);
}
