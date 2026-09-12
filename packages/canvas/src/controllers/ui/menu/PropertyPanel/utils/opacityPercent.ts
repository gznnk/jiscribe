import { OPACITY_MAX, OPACITY_MIN } from "@jiscribe/doc";

/** What the document's 0..1 is multiplied by to read as percent. */
const PERCENT_SCALE = 100;

/** Lowest opacity a row states, in the percent it is stated in: fully see-through. */
export const MIN_OPACITY_PERCENT = OPACITY_MIN * PERCENT_SCALE;

/** Highest opacity a row states, in the percent it is stated in: fully opaque. */
export const MAX_OPACITY_PERCENT = OPACITY_MAX * PERCENT_SCALE;

const clamp = (value: number, min: number, max: number): number =>
	Math.min(max, Math.max(min, value));

/**
 * An opacity as the sidebar states it. Together with {@link toOpacityValue} the
 * single place the two scales meet, so neither opacity row repeats the fact that
 * the document stores 0..1 while the field shows percent.
 *
 * @param opacity - Opacity as the document states it, 0..1; a value outside that range is clamped into it before it is scaled
 * @returns Whole percent between MIN_OPACITY_PERCENT and MAX_OPACITY_PERCENT — rounded, the field stating no decimals and stepping by 1
 */
export const toOpacityPercent = (opacity: number): number =>
	Math.round(
		clamp(opacity * PERCENT_SCALE, MIN_OPACITY_PERCENT, MAX_OPACITY_PERCENT),
	);

/**
 * An opacity as the document states it, from what the sidebar states.
 *
 * @param percent - Percent as the field states it; a value outside MIN_OPACITY_PERCENT..MAX_OPACITY_PERCENT is clamped into that range before it is scaled
 * @returns The 0..1 value to write
 */
export const toOpacityValue = (percent: number): number =>
	clamp(percent, MIN_OPACITY_PERCENT, MAX_OPACITY_PERCENT) / PERCENT_SCALE;
