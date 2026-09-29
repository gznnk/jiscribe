import { createContext, useContext } from "react";

import type { CanvasRegistries } from "./CanvasRegistries";
import { defaultCanvasRegistries } from "./createCanvasRegistries";
import type { ObjectPartRegistry } from "../selection/ObjectPartRegistry";

/**
 * Context that distributes the per-canvas registry bundle to descendant
 * components and hooks in the React tree.
 *
 * Canvas.tsx provides the bundle it built for this instance. The default value
 * is the full `defaultCanvasRegistries` so components rendered in isolation
 * (e.g. unit tests) still resolve the complete set without a Provider.
 *
 * The pure reducer/handler tree cannot read context; it receives the same bundle
 * as an explicit `registries` argument instead (#165).
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

/**
 * The surrounding canvas's sub-part registry alone, for a menu item that has to
 * read what a part selection covers (resolveSelectedTextSlotIds) — the one piece
 * of the bundle a plugin's own component has a use for, the rest of the canvas
 * state reaching it as props (ObjectMenuItemProps).
 */
export function useObjectPartRegistry(): ObjectPartRegistry {
	return useCanvasRegistries().objectPart;
}
