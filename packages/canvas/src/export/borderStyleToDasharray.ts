import { getStrokeDasharray } from "../presentations/objects/utils/getStrokeDasharray";
import { isStrokeDashType } from "../schemas/objects/types/StrokeDashType";

/**
 * Maps a CSS `border-*-style` to the `stroke-dasharray` of the `<rect>` that
 * stands in for that border at export time.
 *
 * The dash rhythm of a CSS dashed/dotted border is UA-defined and not readable
 * from the computed style, so the export approximates it with the canvas' own
 * stroke pattern (`getStrokeDasharray`: dashed = 4w/4w, dotted = w/2w). Only
 * the StrokeDashType values are dashed; every other border-style
 * (solid / none / groove / ...) is drawn as a continuous stroke.
 *
 * @param borderStyle - Computed `border-*-style` value ("dashed" / "dotted" /
 *   "solid" / ...); anything outside StrokeDashType yields undefined
 * @param borderWidth - Border width in user units; the dash lengths scale with it
 * @returns The dasharray attribute value, or undefined for a continuous stroke
 */
export const borderStyleToDasharray = (
	borderStyle: string,
	borderWidth: number,
): string | undefined =>
	isStrokeDashType(borderStyle)
		? getStrokeDasharray(borderStyle, borderWidth)
		: undefined;
