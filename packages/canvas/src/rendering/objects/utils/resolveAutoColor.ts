import { DEFAULT_FILL } from "@jiscribe/doc/model/objects/base/FillStyleDoc";
import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";

import { theme } from "../../../theme/themeTokens";

/**
 * Render-time resolution of auto (theme-following) colors.
 *
 * Color fields follow different theme colors depending on their role:
 *
 * - `ink`     … stroke / fontColor. The "ink" that shows against the background = `theme.objectInk`.
 * - `surface` … fill. The "face" of a shape = `theme.objectSurface`.
 * - `canvas`  … the document's own surface color = `theme.canvasBg`. Not a shape
 *   field, and not a value the document ever holds: `CanvasDoc.background` is
 *   either a concrete color or absent (absent = follow the theme), and the
 *   rendering side (CanvasView) never sees `"auto"` for it. The role exists for
 *   display only — the properties sidebar shows `"auto"` in place of an absent
 *   background and needs its swatch color — and the sidebar turns `"auto"` back
 *   into "absent" on the way out (BackgroundItem).
 *
 * The first two are shape-only tokens, kept separate from the UI chrome tokens
 * (`foreground` / `surface`) so a theme can set the shape ink independently of
 * its menu text color.
 *
 * Single rule: **`"auto"` resolves to the role's theme token, and the result is applied
 * via CSS (style / emotion)**. The resolved value (`var(--jiscribe-*)`) is not resolved by
 * SVG presentation attributes, so pass it via CSS rather than as an attribute. This keeps
 * color resolution and application consistent across all fields (without relying on
 * implicit resolution through `currentColor` or `ContentGroup`; issue #38 / doc 08).
 */
export type AutoColorRole = "ink" | "surface" | "canvas";

/** The theme token that auto resolves to. */
const ROLE_TOKEN: Record<AutoColorRole, string> = {
	ink: theme.objectInk,
	surface: theme.objectSurface,
	canvas: theme.canvasBg,
};

/**
 * Per-role fallback when the value is unspecified (undefined). A shape's own
 * stroke and fill are resolved against its type's defaults before they get here
 * (ObjectShapeStyleDefaultsRegistry), so this catches the fields no type speaks
 * for — a connector label's border, a run's font color.
 */
const ROLE_FALLBACK: Record<AutoColorRole, string> = {
	ink: theme.objectInk,
	surface: DEFAULT_FILL,
	canvas: theme.canvasBg,
};

/**
 * Resolves a color value to a CSS value for rendering.
 *
 * - `"auto"` → the role's theme token (ink: objectInk / surface: objectSurface / canvas: canvasBg)
 * - concrete color → passed through as-is
 * - unspecified → the role default (ink: objectInk / surface: DEFAULT_FILL / canvas: canvasBg)
 *
 * @param value - The color field as the state holds it; `"auto"` and undefined are the two it resolves
 * @param role - Which theme token the value follows: `"ink"` for a stroke or font color, `"surface"` for a fill, `"canvas"` for the document's surface
 * @returns A CSS color, possibly a `var(--jiscribe-*)` token — apply it through CSS, not an SVG presentation attribute
 */
export const resolveAutoColor = (
	value: string | undefined,
	role: AutoColorRole,
): string =>
	value === AUTO_COLOR ? ROLE_TOKEN[role] : (value ?? ROLE_FALLBACK[role]);
