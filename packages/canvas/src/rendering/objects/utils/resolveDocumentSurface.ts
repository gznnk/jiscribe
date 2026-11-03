import { isOpaqueCssColor } from "../../../foundation/color/isOpaqueCssColor";
import { theme } from "../../../foundation/theme/themeTokens";

/**
 * The color of the document's surface, as DocumentSurfaceContext carries it.
 *
 * A see-through `background` gives the theme's canvas color, since that is what
 * shows through it. Browser-only through {@link isOpaqueCssColor}.
 *
 * @param background the document's `background`; undefined (follow the theme)
 *   and anything {@link isOpaqueCssColor} rejects give `theme.canvasBg`
 * @returns `background` itself when opaque, otherwise the theme's
 *   `var(--jiscribe-canvas-bg, …)` token
 */
export const resolveDocumentSurface = (
	background: string | undefined,
): string =>
	background !== undefined && isOpaqueCssColor(background)
		? background
		: theme.canvasBg;
