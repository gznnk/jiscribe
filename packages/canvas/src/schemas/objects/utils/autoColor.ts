/**
 * Sentinel value indicating that a shape's color (stroke / fontColor / fill)
 * is in the "follow the theme (unspecified)" state. Stored as `"auto"` in the
 * same string field as concrete colors without harming portability (it carries
 * the unambiguous meaning of "follow the theme").
 *
 * At render time it is resolved to `currentColor` (= theme foreground) by
 * `resolveAutoColor` on the `rendering` side. The data and State layers keep
 * it as `"auto"` (to avoid corrupting the stored value).
 */
export const AUTO_COLOR = "auto";

/** Determines whether a color value is the auto sentinel (theme-following). */
export const isAutoColor = (value: unknown): value is typeof AUTO_COLOR =>
	value === AUTO_COLOR;
