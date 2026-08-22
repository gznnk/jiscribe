import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";

import { theme } from "../../../constants/theme";

/**
 * Render-time resolution of auto (theme-following) colors.
 *
 * Color fields follow different theme colors depending on their role:
 *
 * - `ink`     … stroke / fontColor. The "ink" that shows against the background = `theme.objectInk`.
 * - `surface` … fill. The "face" of a shape = `theme.objectSurface`.
 *
 * Both are shape-only tokens, kept separate from the UI chrome tokens
 * (`foreground` / `surface`) so a theme can set the shape ink independently of
 * its menu text color.
 *
 * Single rule: **`"auto"` resolves to the role's theme token, and the result is applied
 * via CSS (style / emotion)**. The resolved value (`var(--jiscribe-*)`) is not resolved by
 * SVG presentation attributes, so pass it via CSS rather than as an attribute. This keeps
 * color resolution and application consistent across all fields (without relying on
 * implicit resolution through `currentColor` or `ContentGroup`; issue #38 / doc 08).
 */
export type AutoColorRole = "ink" | "surface";

/** The theme token that auto resolves to. */
const ROLE_TOKEN: Record<AutoColorRole, string> = {
	ink: theme.objectInk,
	surface: theme.objectSurface,
};

/** Per-role fallback when the value is unspecified (undefined). */
const ROLE_FALLBACK: Record<AutoColorRole, string> = {
	ink: theme.objectInk,
	surface: "transparent",
};

/**
 * Resolves a color value to a CSS value for rendering.
 *
 * - `"auto"` → the role's theme token (ink: objectInk / surface: objectSurface)
 * - concrete color → passed through as-is
 * - unspecified → `fallback`, or the role default if none (ink: objectInk / surface: transparent)
 */
export const resolveAutoColor = (
	value: string | undefined,
	role: AutoColorRole,
	fallback?: string,
): string =>
	value === AUTO_COLOR
		? ROLE_TOKEN[role]
		: (value ?? fallback ?? ROLE_FALLBACK[role]);
