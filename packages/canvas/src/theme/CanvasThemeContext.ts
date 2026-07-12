import { createContext, useContext } from "react";

import type { CanvasTheme } from "./CanvasTheme";
import { darkCanvasTheme } from "./themePresets";

/**
 * Context that distributes the active theme to descendant components.
 *
 * Canvas.tsx provides the host-injected theme (default: `darkCanvasTheme`).
 * Consumers read the JS-consumed parts (handle dimensions, fontFamily);
 * CSS-consumed tokens flow through `--jiscribe-*` custom properties instead
 * (see `theme/themeCssVars.ts`). The default value keeps components working
 * outside a Provider (e.g. in unit tests, CanvasThumbnail).
 */
export const CanvasThemeContext = createContext<CanvasTheme>(darkCanvasTheme);

/** Retrieves the current canvas theme. */
export function useCanvasTheme(): CanvasTheme {
	return useContext(CanvasThemeContext);
}
