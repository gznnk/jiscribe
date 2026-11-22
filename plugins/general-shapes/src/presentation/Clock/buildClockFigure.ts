import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import { buildEllipsePath } from "../shared/pictogramPaths";

/**
 * The hands, as fractions of the face's radius along their own direction. They
 * show ten past ten, so they open into a V that leaves the 12 and 6 marks clear.
 */
const CLOCK_HOUR_HAND_RATIO = 0.5;
const CLOCK_MINUTE_HAND_RATIO = 0.72;

/** Clockwise angles from 12 o'clock, in radians: the hour hand at 10, the minute hand at 2. */
const CLOCK_HOUR_HAND_ANGLE = (Math.PI * 2 * 10) / 12;
const CLOCK_MINUTE_HAND_ANGLE = (Math.PI * 2 * 2) / 12;

/** The 12/3/6/9 marks, as fractions of the face's radius: where each starts and ends. */
const CLOCK_MARK_INNER_RATIO = 0.8;
const CLOCK_MARK_OUTER_RATIO = 0.92;

/**
 * Lays out a clock over the bounding box whose top-left corner is at (x, y): the
 * face is the box's inscribed ellipse, and the hands and the four quarter marks
 * are detail lines, so a fill paints the face alone. Shared by the object
 * renderer (centered origin) and the draw-drag preview that reuses it.
 */
export const buildClockFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => {
	const centerX = x + width / 2;
	const centerY = y + height / 2;
	const radiusX = width / 2;
	const radiusY = height / 2;

	// Each axis takes its own radius, so a stretched box stretches the hands and
	// marks with the face.
	const pointAt = (angle: number, radiusRatio: number): string =>
		`${centerX + radiusX * radiusRatio * Math.sin(angle)} ${centerY - radiusY * radiusRatio * Math.cos(angle)}`;
	const hand = (angle: number, radiusRatio: number): string =>
		`M ${centerX} ${centerY} L ${pointAt(angle, radiusRatio)}`;
	const marks = [0, 1, 2, 3].map((quarter) => {
		const angle = (Math.PI / 2) * quarter;
		return `M ${pointAt(angle, CLOCK_MARK_INNER_RATIO)} L ${pointAt(angle, CLOCK_MARK_OUTER_RATIO)}`;
	});

	return {
		body: [buildEllipsePath(centerX, centerY, radiusX, radiusY)],
		detail: [
			hand(CLOCK_HOUR_HAND_ANGLE, CLOCK_HOUR_HAND_RATIO),
			hand(CLOCK_MINUTE_HAND_ANGLE, CLOCK_MINUTE_HAND_RATIO),
			...marks,
		],
	};
};
