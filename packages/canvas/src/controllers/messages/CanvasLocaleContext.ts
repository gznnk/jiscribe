import { createContext, useContext } from "react";

/**
 * Context that distributes the active canvas locale to descendant components,
 * so plugins can resolve their own dictionaries. Canvas.tsx provides
 * `props.locale`; the default `"en"` keeps components working outside a Provider.
 */
export const CanvasLocaleContext = createContext<string>("en");

/** Retrieves the active canvas locale (default `"en"`). */
export function useCanvasLocale(): string {
	return useContext(CanvasLocaleContext);
}
