import { createContext, useContext } from "react";

import { theme } from "../../foundation/theme/themeTokens";

/**
 * Rendering-layer context carrying the color of the document's surface: what a
 * default label — a connector's, or a `features.text: "label"` caption — knocks
 * the lines behind it out with (resolveLabelFill).
 *
 * `<Canvas>` provides it from the document's `background`
 * (resolveDocumentSurface). The default is the theme's canvas color, which is
 * the right reading for a tree with no Provider (tests, isolated components).
 */
export const DocumentSurfaceContext = createContext<string>(theme.canvasBg);

/**
 * Subscribes to the surrounding `<Canvas>` document surface color.
 *
 * @returns A CSS color: the document's opaque `background`, or the theme's
 *   `var(--jiscribe-canvas-bg, …)` token, which only resolves through CSS
 */
export function useDocumentSurface(): string {
	return useContext(DocumentSurfaceContext);
}
