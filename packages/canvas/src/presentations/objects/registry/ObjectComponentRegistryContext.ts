import { createContext, useContext } from "react";

import {
	type ObjectComponentRegistry,
	objectComponentRegistry,
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
 * The default value is the module-level singleton so renderers used in isolation
 * (e.g. unit tests) still resolve the full set without a Provider.
 */
export const ObjectComponentRegistryContext =
	createContext<ObjectComponentRegistry>(objectComponentRegistry);

/**
 * Retrieves the `ObjectComponentRegistry` for the surrounding `<Canvas>`.
 */
export function useObjectComponentRegistry(): ObjectComponentRegistry {
	return useContext(ObjectComponentRegistryContext);
}
