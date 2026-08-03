import { createContext, useContext } from "react";

import {
	type ObjectSvgDefsRegistry,
	createObjectSvgDefsRegistry,
} from "./ObjectSvgDefsRegistry";

/**
 * Presentation-layer context that distributes the per-canvas
 * `ObjectSvgDefsRegistry` to `CanvasDefs`.
 *
 * Presentation components must not import the full `CanvasRegistries` bundle from
 * the controllers layer (docs/02-architecture.md), so this presentation-owned
 * registry is handed down separately; `Canvas.tsx` provides
 * `registries.objectSvgDefs` into it (controllers → presentations is allowed).
 *
 * The default is a fresh empty registry, so rendering without a Provider yields
 * an empty `<defs>` rather than reaching for a module-level singleton (there is
 * none — #165).
 */
export const ObjectSvgDefsRegistryContext =
	createContext<ObjectSvgDefsRegistry>(createObjectSvgDefsRegistry());

/**
 * Retrieves the `ObjectSvgDefsRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectSvgDefsRegistry(): ObjectSvgDefsRegistry {
	return useContext(ObjectSvgDefsRegistryContext);
}
