import type { StrokeDashType } from "../../../types/core/StrokeDashType";

/**
 * Convert StrokeDashType to SVG strokeDasharray value
 *
 * @param strokeDashType - The stroke dash type
 * @param strokeWidth - The stroke width (default: 1)
 * @returns SVG strokeDasharray value or undefined for solid lines
 */
export const convertStrokeDashTypeToArray = (
	strokeDashType: StrokeDashType,
	strokeWidth: number = 1,
): string | undefined => {
	switch (strokeDashType) {
		case "dashed":
			// Scale: dash length = 8 * strokeWidth, gap = 4 * strokeWidth
			return `${8 * strokeWidth},${4 * strokeWidth}`;
		case "dotted":
			// Scale: dot length = 2 * strokeWidth, gap = 2 * strokeWidth
			return `${2 * strokeWidth},${2 * strokeWidth}`;
		case "solid":
		default:
			return undefined;
	}
};
