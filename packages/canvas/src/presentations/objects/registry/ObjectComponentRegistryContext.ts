import { createContext, useContext } from "react";

import {
	type ObjectComponentRegistry,
	createObjectComponentRegistry,
} from "./ObjectComponentRegistry";

/**
 * Presentation-layer context that distributes the per-canvas
 * `ObjectComponentRegistry` to renderers (e.g. `ObjectsRenderer`).
 *
 * Presentation components must not import the full `CanvasRegistries` bundle from
 * the controllers layer (docs/02-architecture.md), so this presentation-owned
 * registry is handed down separately; `Canvas.tsx` provides
 * `registries.objectComponent` into it (controllers → presentations is allowed).
 *
 * The default is a fresh empty registry, so rendering without a Provider yields
 * nothing rather than reaching for a module-level singleton (there is none — #165).
 * `Canvas` and `CanvasThumbnail` always provide the canvas's own registry.
 */
export const ObjectComponentRegistryContext =
	createContext<ObjectComponentRegistry>(createObjectComponentRegistry());

/**
 * Retrieves the `ObjectComponentRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectComponentRegistry(): ObjectComponentRegistry {
	return useContext(ObjectComponentRegistryContext);
}
