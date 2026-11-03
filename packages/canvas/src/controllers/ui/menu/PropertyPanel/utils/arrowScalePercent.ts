import { ARROW_SCALE_MAX, ARROW_SCALE_MIN } from "@jiscribe/doc";

/** What the document's factor is multiplied by to read as percent. */
const PERCENT_SCALE = 100;

/** Smallest arrowhead size a row states, in the percent it is stated in. */
export const MIN_ARROW_SCALE_PERCENT = ARROW_SCALE_MIN * PERCENT_SCALE;

/** Largest arrowhead size a row states, in the percent it is stated in. */
export const MAX_ARROW_SCALE_PERCENT = ARROW_SCALE_MAX * PERCENT_SCALE;

const clamp = (value: number, min: number, max: number): number =>
	Math.min(max, Math.max(min, value));

/**
 * An `arrowScale` as the sidebar states it. Together with
 * {@link toArrowScaleValue} the single place the two scales meet.
 *
 * @param arrowScale - The factor as the document states it, 1 being the size the stroke width alone gives; a value outside ARROW_SCALE_MIN..ARROW_SCALE_MAX is clamped into it before it is scaled
 * @returns Whole percent between MIN_ARROW_SCALE_PERCENT and MAX_ARROW_SCALE_PERCENT — rounded, the field stepping by 1
 */
export const toArrowScalePercent = (arrowScale: number): number =>
	Math.round(
		clamp(
			arrowScale * PERCENT_SCALE,
			MIN_ARROW_SCALE_PERCENT,
			MAX_ARROW_SCALE_PERCENT,
		),
	);

/**
 * An `arrowScale` as the document states it, from what the sidebar states.
 *
 * @param percent - Percent as the field states it; a value outside MIN_ARROW_SCALE_PERCENT..MAX_ARROW_SCALE_PERCENT is clamped into that range before it is scaled
 * @returns The factor to write
 */
export const toArrowScaleValue = (percent: number): number =>
	clamp(percent, MIN_ARROW_SCALE_PERCENT, MAX_ARROW_SCALE_PERCENT) /
	PERCENT_SCALE;
