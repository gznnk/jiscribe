import type { Point } from "@jiscribe/geometry";

import type {
	CalloutTail,
	CalloutTailSide,
} from "../../schema/callout/CalloutDoc";
import {
	CALLOUT_TAIL_BASE_RATIO,
	CALLOUT_TAIL_BASE_SLOTS,
	CALLOUT_TAIL_DEFAULT,
	CALLOUT_TAIL_RATIO,
} from "../../schema/callout/CalloutDoc";
import type { CalloutState } from "../../state/callout/CalloutState";

/** Effective tail (field absent = default). */
export const resolveCalloutTail = (
	state: Pick<CalloutState, "tail">,
): CalloutTail => state.tail ?? CALLOUT_TAIL_DEFAULT;

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

/** Base-slot center ratio for a tip at `position` (first half → start slot). */
const calcBaseSlotRatio = (position: number): number =>
	position < 0.5 ? CALLOUT_TAIL_BASE_SLOTS.start : CALLOUT_TAIL_BASE_SLOTS.end;

/** True for left/right tails, whose band and base run along the vertical axis. */
export const isVerticalTailSide = (side: CalloutTailSide): boolean =>
	side === "left" || side === "right";

/**
 * Tail tip point in local coordinates (origin at the shape center): on the
 * bounding box's `side` edge, `position` (0..1) along it.
 */
export const calcCalloutTailTipPoint = (
	width: number,
	height: number,
	tail: CalloutTail,
): Point => {
	const position = clamp(tail.position, 0, 1);
	if (isVerticalTailSide(tail.side)) {
		return {
			x: tail.side === "left" ? -width / 2 : width / 2,
			y: -height / 2 + height * position,
		};
	}
	return {
		x: -width / 2 + width * position,
		y: tail.side === "top" ? -height / 2 : height / 2,
	};
};

/**
 * Closed silhouette polygon (bubble body + tail) for a bounding box whose
 * top-left corner is at (x, y). The tail occupies the CALLOUT_TAIL_RATIO band
 * on its side, so the whole silhouette stays inside the bounding box. The base
 * sits in one of the two fixed slots per edge (CALLOUT_TAIL_BASE_SLOTS); only
 * the tip follows `position`. Single geometry source shared by the renderer
 * path, the connector outline, and the draw-drag preview.
 */
export const calcCalloutPolygon = (
	x: number,
	y: number,
	width: number,
	height: number,
	tail: CalloutTail,
): Point[] => {
	const position = clamp(tail.position, 0, 1);

	if (!isVerticalTailSide(tail.side)) {
		const band = height * CALLOUT_TAIL_RATIO;
		const baseHalf = (width * CALLOUT_TAIL_BASE_RATIO) / 2;
		const tipX = x + width * position;
		const baseCenterX = x + width * calcBaseSlotRatio(position);

		if (tail.side === "bottom") {
			const bodyBottom = y + height - band;
			return [
				{ x, y },
				{ x: x + width, y },
				{ x: x + width, y: bodyBottom },
				{ x: baseCenterX + baseHalf, y: bodyBottom },
				{ x: tipX, y: y + height },
				{ x: baseCenterX - baseHalf, y: bodyBottom },
				{ x, y: bodyBottom },
			];
		}
		const bodyTop = y + band;
		return [
			{ x, y: bodyTop },
			{ x: baseCenterX - baseHalf, y: bodyTop },
			{ x: tipX, y },
			{ x: baseCenterX + baseHalf, y: bodyTop },
			{ x: x + width, y: bodyTop },
			{ x: x + width, y: y + height },
			{ x, y: y + height },
		];
	}

	const band = width * CALLOUT_TAIL_RATIO;
	const baseHalf = (height * CALLOUT_TAIL_BASE_RATIO) / 2;
	const tipY = y + height * position;
	const baseCenterY = y + height * calcBaseSlotRatio(position);

	if (tail.side === "right") {
		const bodyRight = x + width - band;
		return [
			{ x, y },
			{ x: bodyRight, y },
			{ x: bodyRight, y: baseCenterY - baseHalf },
			{ x: x + width, y: tipY },
			{ x: bodyRight, y: baseCenterY + baseHalf },
			{ x: bodyRight, y: y + height },
			{ x, y: y + height },
		];
	}
	const bodyLeft = x + band;
	return [
		{ x: bodyLeft, y },
		{ x: x + width, y },
		{ x: x + width, y: y + height },
		{ x: bodyLeft, y: y + height },
		{ x: bodyLeft, y: baseCenterY + baseHalf },
		{ x, y: tipY },
		{ x: bodyLeft, y: baseCenterY - baseHalf },
	];
};
