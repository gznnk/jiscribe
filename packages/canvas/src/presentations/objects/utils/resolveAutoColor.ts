import { theme } from "../../../constants/theme";
import { AUTO_COLOR } from "../../../schemas/objects/utils/autoColor";

/**
 * Render-time resolution of auto (theme-following) colors.
 *
 * Color fields follow different theme colors depending on their role:
 *
 * - `ink`     … stroke / fontColor. The "ink" that shows against the background = theme foreground.
 * - `surface` … fill. The "face" of a shape = the theme's panel surface.
 *
 * Single rule: **`"auto"` resolves to the role's theme token, and the result is applied
 * via CSS (style / emotion)**. The resolved value (`var(--vscode-*)`) is not resolved by
 * SVG presentation attributes, so pass it via CSS rather than as an attribute. This keeps
 * color resolution and application consistent across all fields (without relying on
 * implicit resolution through `currentColor` or `ContentGroup`; issue #38 / doc 08).
 */
export type AutoColorRole = "ink" | "surface";

/** The theme token that auto resolves to. */
const ROLE_TOKEN: Record<AutoColorRole, string> = {
	ink: theme.foreground,
	surface: theme.surface,
};

/** Per-role fallback when the value is unspecified (undefined). */
const ROLE_FALLBACK: Record<AutoColorRole, string> = {
	ink: theme.foreground,
	surface: "transparent",
};

/**
 * Resolves a color value to a CSS value for rendering.
 *
 * - `"auto"` → the role's theme token (ink: foreground / surface: surface)
 * - concrete color → passed through as-is
 * - unspecified → `fallback`, or the role default if none (ink: foreground / surface: transparent)
 */
export const resolveAutoColor = (
	value: string | undefined,
	role: AutoColorRole,
	fallback?: string,
): string =>
	value === AUTO_COLOR
		? ROLE_TOKEN[role]
		: (value ?? fallback ?? ROLE_FALLBACK[role]);
