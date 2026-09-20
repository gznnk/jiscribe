/**
 * Whether a color icon draws the transparency marking (a checker) instead of
 * the color: `transparent`, its rgba spelling, and an empty value.
 */
export const isTransparentPreviewColor = (color: string): boolean =>
	color === "transparent" || color === "rgba(0,0,0,0)" || color === "";
