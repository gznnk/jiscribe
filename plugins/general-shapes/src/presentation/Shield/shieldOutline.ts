import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import { OUTLINE_CURVE_SEGMENTS } from "@jiscribe/canvas-sdk";
import type { Dimensions } from "@jiscribe/geometry";
import { sampleCubicBezier } from "@jiscribe/geometry";

import { calcShieldCurve } from "./calcShieldCurve";

/**
 * Shield outline (centered): the flat top and straight flanks as corners, the
 * two lower cubics sampled (buildShieldFigure draws the equivalent path).
 * `.slice(1)` drops each segment's start point, already emitted by what precedes
 * it. Without this a connector's center anchor would land on the bounding box,
 * well outside the tapered lower half.
 */
export const shieldOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const { shoulderY, rightFlank, leftFlank } = calcShieldCurve(
		-halfWidth,
		-halfHeight,
		width,
		height,
	);
	return [
		{ x: -halfWidth, y: -halfHeight },
		{ x: halfWidth, y: -halfHeight },
		{ x: halfWidth, y: shoulderY },
		...sampleCubicBezier(...rightFlank, OUTLINE_CURVE_SEGMENTS).slice(1),
		...sampleCubicBezier(...leftFlank, OUTLINE_CURVE_SEGMENTS).slice(1),
	];
};
