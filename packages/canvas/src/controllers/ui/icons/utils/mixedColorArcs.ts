import { calcRotatedPoint, degreesToRadians } from "@jiscribe/geometry";

import type { MixedColorSegment } from "../../utils/calcMixedColorSegments";

/**
 * Clock angle the first slice of a round swatch starts at: straight down, so
 * two colors split it into a left and a right half.
 */
const FIRST_SEGMENT_CLOCK_ANGLE = 180;

/** Where a slice of a round swatch runs, in clock degrees (0 = up, growing clockwise). */
export type SegmentClockAngles = { startAngle: number; endAngle: number };

/**
 * The span a slice takes round a circle.
 *
 * @param segment - The slice, its fractions taken as shares of a full turn
 * @returns Clock degrees from FIRST_SEGMENT_CLOCK_ANGLE on; `endAngle` may pass 360
 */
export const calcSegmentClockAngles = (
	segment: MixedColorSegment,
): SegmentClockAngles => ({
	startAngle: FIRST_SEGMENT_CLOCK_ANGLE + segment.start * 360,
	endAngle: FIRST_SEGMENT_CLOCK_ANGLE + segment.end * 360,
});

const COORDINATE_DECIMALS = 3;

const roundCoordinate = (value: number): number =>
	Number(value.toFixed(COORDINATE_DECIMALS));

const formatClockPoint = (
	cx: number,
	cy: number,
	r: number,
	angle: number,
): string => {
	const point = calcRotatedPoint(cx, cy - r, cx, cy, degreesToRadians(angle));
	// Rounded so the trigonometry's float noise (12.000000000000002) stays out of the markup.
	return `${roundCoordinate(point.x)} ${roundCoordinate(point.y)}`;
};

/** The arc command from the point at `startAngle` on, without the move to it. */
const formatClockArc = (
	cx: number,
	cy: number,
	r: number,
	{ startAngle, endAngle }: SegmentClockAngles,
): string => {
	const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
	return `A ${r} ${r} 0 ${largeArcFlag} 1 ${formatClockPoint(cx, cy, r, endAngle)}`;
};

/**
 * The clockwise arc of a circle between two clock angles, as SVG path data.
 * Spans are expected to stay under a full turn; one of 360 collapses to
 * nothing, its two ends meeting.
 */
export const calcClockArcPath = (
	cx: number,
	cy: number,
	r: number,
	angles: SegmentClockAngles,
): string =>
	`M ${formatClockPoint(cx, cy, r, angles.startAngle)} ${formatClockArc(cx, cy, r, angles)}`;

/** The pie slice between two clock angles, as SVG path data. */
export const calcClockSectorPath = (
	cx: number,
	cy: number,
	r: number,
	angles: SegmentClockAngles,
): string =>
	`M ${cx} ${cy} L ${formatClockPoint(cx, cy, r, angles.startAngle)} ${formatClockArc(cx, cy, r, angles)} Z`;
