import { OUTLINE_CURVE_SEGMENTS } from "@jiscribe/canvas-sdk/doc";
import type { ObjectDocOutlineCalculator } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";
import { sampleEllipseArc } from "@jiscribe/geometry";

/**
 * Clock outline (centered): the face, the box's inscribed ellipse. The bounding
 * box would leave a connector aimed at a corner hanging well clear of the rim.
 *
 * `OUTLINE_CURVE_SEGMENTS` is the budget of a half-ellipse, so the whole face
 * takes twice that. The sampled arc ends where it starts, so the repeated last
 * point is dropped.
 */
export const clockOutline: ObjectDocOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	sampleEllipseArc(
		0,
		0,
		width / 2,
		height / 2,
		0,
		360,
		OUTLINE_CURVE_SEGMENTS * 2,
	).slice(0, -1);
