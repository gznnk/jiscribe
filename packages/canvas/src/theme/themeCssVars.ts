import type { CanvasThemeTokens } from "./CanvasTheme";

/**
 * Neutral CSS custom property name for each theme token.
 *
 * This map is the single source of truth for the `--jiscribe-*` names: the
 * Canvas root injects token values under these names (`buildThemeCssVars`),
 * and the static token object in `constants/theme.ts` references the same
 * names, so the two sides cannot drift apart.
 */
export const THEME_TOKEN_CSS_VARS: Record<keyof CanvasThemeTokens, string> = {
	canvasBg: "--jiscribe-canvas-bg",
	surface: "--jiscribe-surface",
	surfaceHover: "--jiscribe-surface-hover",
	surfaceActive: "--jiscribe-surface-active",
	border: "--jiscribe-border",
	borderSubtle: "--jiscribe-border-subtle",
	foreground: "--jiscribe-foreground",
	foregroundMuted: "--jiscribe-foreground-muted",
	disabledForeground: "--jiscribe-disabled-foreground",
	iconForeground: "--jiscribe-icon-foreground",
	accent: "--jiscribe-accent",
	inputBg: "--jiscribe-input-bg",
	inputFg: "--jiscribe-input-fg",
	inputBorder: "--jiscribe-input-border",
	inputPlaceholder: "--jiscribe-input-placeholder",
	errorFg: "--jiscribe-error-fg",
	shadow: "--jiscribe-shadow",
	sliderTrack: "--jiscribe-slider-track",
	transparentChecker: "--jiscribe-transparent-checker",
	radius: "--jiscribe-radius",
	handleAccent: "--jiscribe-handle-accent",
	handleFill: "--jiscribe-handle-fill",
	connectionAccent: "--jiscribe-connection-accent",
	scrollbarTrack: "--jiscribe-scrollbar-track",
	scrollbarThumb: "--jiscribe-scrollbar-thumb",
	scrollbarThumbHover: "--jiscribe-scrollbar-thumb-hover",
	objectInk: "--jiscribe-object-ink",
	objectSurface: "--jiscribe-object-surface",
};

/**
 * Converts theme tokens into an inline-style object of `--jiscribe-*` CSS
 * custom property declarations, applied to the Canvas root element.
 * Custom properties inherit, so every descendant (menus, overlays, SVG
 * rendering) resolves the same theme without prop drilling.
 */
export const buildThemeCssVars = (
	tokens: CanvasThemeTokens,
): Record<string, string> => {
	const cssVars: Record<string, string> = {};
	for (const tokenName of Object.keys(
		THEME_TOKEN_CSS_VARS,
	) as (keyof CanvasThemeTokens)[]) {
		cssVars[THEME_TOKEN_CSS_VARS[tokenName]] = tokens[tokenName];
	}
	return cssVars;
};
