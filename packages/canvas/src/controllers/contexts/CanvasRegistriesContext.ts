import { createContext, useContext } from "react";

import type { CanvasRegistries } from "../setup/CanvasRegistries";
import { defaultCanvasRegistries } from "../setup/createCanvasRegistries";

/**
 * Context that distributes the per-canvas registry bundle to descendant
 * components and hooks in the React tree.
 *
 * Canvas.tsx provides the bundle it built for this instance. The default value
 * is the full `defaultCanvasRegistries` so components rendered in isolation
 * (e.g. unit tests) still resolve the complete set without a Provider.
 *
 * The pure reducer/handler tree cannot read React context; it receives the same
 * bundle out-of-band through `CanvasControllerState.registries` (see #165 Option B).
 */
export const CanvasRegistriesContext = createContext<CanvasRegistries>(
	defaultCanvasRegistries,
);

/**
 * Retrieves the registry bundle for the surrounding `<Canvas>`.
 */
export function useCanvasRegistries(): CanvasRegistries {
	return useContext(CanvasRegistriesContext);
}
