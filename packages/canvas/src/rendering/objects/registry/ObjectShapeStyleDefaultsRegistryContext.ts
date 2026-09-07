import {
	type ObjectShapeStyleDefaultsRegistry,
	createObjectShapeStyleDefaultsRegistry,
} from "@jiscribe/doc/plugin/ObjectShapeStyleDefaultsRegistry";
import { createContext, useContext } from "react";

/**
 * Rendering-layer context that distributes the per-canvas
 * `ObjectShapeStyleDefaultsRegistry` to shape renderers (handed down separately
 * from the controllers-layer bundle for the same reason as
 * ObjectComponentRegistryContext).
 *
 * The default is a fresh empty registry, so rendering without a Provider draws
 * every unset stroke and fill with the shared last resort
 * (SHAPE_STYLE_FALLBACK).
 * `Canvas` and `CanvasThumbnail` always provide the canvas's own registry.
 */
export const ObjectShapeStyleDefaultsRegistryContext =
	createContext<ObjectShapeStyleDefaultsRegistry>(
		createObjectShapeStyleDefaultsRegistry(),
	);

/**
 * Retrieves the `ObjectShapeStyleDefaultsRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectShapeStyleDefaultsRegistry(): ObjectShapeStyleDefaultsRegistry {
	return useContext(ObjectShapeStyleDefaultsRegistryContext);
}
