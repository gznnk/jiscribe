import { createContext, useContext } from "react";

import {
	type ObjectComponentRegistry,
	createObjectComponentRegistry,
} from "./ObjectComponentRegistry";

/**
 * Presentation-layer context that distributes the per-canvas
 * `ObjectComponentRegistry` to renderers (e.g. `ObjectsRenderer`).
 *
 * The full `CanvasRegistries` bundle lives in the controllers layer, which
 * presentation components must not import (docs/02-architecture.md). So the
 * component registry — a presentation-owned registry — is handed down through
 * this presentation-layer context instead. `Canvas.tsx` (controllers) provides
 * `registries.objectComponent` into it; the direction controllers → presentations
 * is allowed, the reverse is not.
 *
 * The default is a fresh empty registry: rendering a content component without a
 * Provider yields nothing rather than reaching for a global singleton (there is
 * no module-level registry anymore — #165 Phase 5). `Canvas` and `CanvasThumbnail`
 * always provide the canvas's own registry.
 */
export const ObjectComponentRegistryContext =
	createContext<ObjectComponentRegistry>(createObjectComponentRegistry());

/**
 * Retrieves the `ObjectComponentRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectComponentRegistry(): ObjectComponentRegistry {
	return useContext(ObjectComponentRegistryContext);
}
