import type { CanvasThemeTokens } from "../theme/CanvasTheme";
import { THEME_TOKEN_CSS_VARS } from "../theme/themeCssVars";
import { darkCanvasTheme } from "../theme/themePresets";

/**
 * Static style tokens referencing the neutral `--jiscribe-*` CSS custom
 * properties.
 *
 * Each token resolves to `var(--jiscribe-<name>, <dark fallback>)`. The
 * Canvas root injects the active theme's values under those names (see
 * `theme/themeCssVars.ts`), so styles built from this object follow the
 * host-injected theme at CSS resolution time — emotion styles can stay
 * static module-level constants. The dark fallbacks keep fragments rendered
 * outside a themed root (exported SVG, isolated component tests) legible.
 *
 * Hosts never see `--jiscribe-*` directly: they pass a `CanvasTheme` object
 * (see `theme/CanvasTheme.ts`). A VSCode host maps `--vscode-*` variables
 * onto the neutral tokens by passing `var(--vscode-...)` strings as token
 * values.
 *
 * Note: this only covers the colors of the UI chrome (menus, toolbars,
 * selection frames, etc.). The colors of the shapes themselves
 * (fill/stroke/fontColor) are data saved in the document and are not the
 * subject of theme tokens.
 */
export const theme = Object.fromEntries(
	(Object.keys(THEME_TOKEN_CSS_VARS) as (keyof CanvasThemeTokens)[]).map(
		(tokenName) => [
			tokenName,
			`var(${THEME_TOKEN_CSS_VARS[tokenName]}, ${darkCanvasTheme.tokens[tokenName]})`,
		],
	),
) as CanvasThemeTokens;
