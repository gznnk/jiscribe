import { isTransparentColor } from "../../../../foundation/color/isTransparentColor";
import { theme } from "../../../../foundation/theme/themeTokens";

/**
 * What a color swatch is painted with. A color that paints nothing
 * (isTransparentColor) draws the checker instead, so an unfilled shape is not
 * mistaken for a white one.
 */
export const swatchBackground = (swatchColor: string): string =>
	isTransparentColor(swatchColor)
		? `repeating-conic-gradient(${theme.transparentChecker} 0% 25%, transparent 0% 50%) 50% / 8px 8px`
		: swatchColor;
