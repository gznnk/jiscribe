import type { Point } from "@workspace/geometry";

import type {
	GroupMarkerDirection,
	GroupMarkerDirectionField,
	GroupMarkerTipPositionField,
} from "../../schema/shared/GroupMarkerFields";
import {
	GROUP_MARKER_DIRECTION_DEFAULT,
	GROUP_MARKER_TIP_POSITION_DEFAULT,
} from "../../schema/shared/GroupMarkerFields";

/** The two axes of a group marker's box, named by role rather than by x / y. */
export type GroupMarkerAxes = {
	/** How far the marker reaches out from its arms: the box's side along the direction. */
	depth: number;
	/** How far the arms reach: the box's side across the direction. */
	span: number;
};

/** Whether the marker runs top-to-bottom (its arms reach a vertical edge). */
export const isVerticalGroupMarker = (
	direction: GroupMarkerDirection,
): boolean => direction === "left" || direction === "right";

/**
 * Splits a box into the marker's two axes. A left/right marker reaches across
 * the width and runs along the height; an up/down one is the other way round.
 *
 * @param width Box width in local px.
 * @param height Box height in local px.
 * @param direction Which way the marker faces.
 * @returns The depth and span the path is built from.
 */
export const calcGroupMarkerAxes = (
	width: number,
	height: number,
	direction: GroupMarkerDirection,
): GroupMarkerAxes =>
	isVerticalGroupMarker(direction)
		? { depth: width, span: height }
		: { depth: height, span: width };

/**
 * Maps a point from the canonical marker space — outer edge at x = 0, arm ends
 * at x = depth, span running along y — onto the box whose top-left corner is at
 * (x, y). Every direction is this one construction seen from a different side,
 * so the path, the tip and the label anchor cannot drift apart.
 *
 * @param point The canonical point; x in [0, depth], y in [0, span].
 * @param x Left edge of the box in local coordinates.
 * @param y Top edge of the box in local coordinates.
 * @param width Box width.
 * @param height Box height.
 * @param direction Which way the marker faces.
 * @returns The same point in the box's coordinates.
 */
export const mapCanonicalGroupMarkerPoint = (
	point: Point,
	x: number,
	y: number,
	width: number,
	height: number,
	direction: GroupMarkerDirection,
): Point => {
	switch (direction) {
		case "left":
			return { x: x + point.x, y: y + point.y };
		case "right":
			return { x: x + width - point.x, y: y + point.y };
		case "up":
			return { x: x + point.y, y: y + point.x };
		case "down":
			return { x: x + point.y, y: y + height - point.x };
	}
};

/**
 * Where the tip sits on the box, for the label to hang off and for the path to
 * turn at. It is always on the outer edge — the brace's cusp, the stem's end,
 * and the plain bracket's mid-spine point are the same construction.
 *
 * @param x Left edge of the box in local coordinates.
 * @param y Top edge of the box in local coordinates.
 * @param width Box width.
 * @param height Box height.
 * @param direction Which way the marker faces; the tip lands on that edge.
 * @param tipPosition 0..1 along the span; values outside the range are the caller's to reject.
 * @returns The tip in the box's coordinates.
 */
export const calcGroupMarkerTip = (
	x: number,
	y: number,
	width: number,
	height: number,
	direction: GroupMarkerDirection,
	tipPosition: number,
): Point => {
	const { span } = calcGroupMarkerAxes(width, height, direction);
	return mapCanonicalGroupMarkerPoint(
		{ x: 0, y: tipPosition * span },
		x,
		y,
		width,
		height,
		direction,
	);
};

/**
 * What the resolvers below read. Both optional fields are named even though each
 * resolver reads one of them, because a parameter of only optional fields is a
 * weak type: `{ tipPosition?: number }` alone would reject the plain bracket's
 * state, which declares `direction` and no tip position at all.
 */
type GroupMarkerResolvableFields = GroupMarkerDirectionField &
	GroupMarkerTipPositionField;

/** Reads the direction off a state that may leave it out. */
export const resolveGroupMarkerDirection = (
	state: GroupMarkerResolvableFields,
): GroupMarkerDirection => state.direction ?? GROUP_MARKER_DIRECTION_DEFAULT;

/**
 * Reads the tip position off a state that may leave it out. A marker without the
 * field at all (the plain bracket) therefore lands on the middle of its span,
 * which is where its label belongs.
 */
export const resolveGroupMarkerTipPosition = (
	state: GroupMarkerResolvableFields,
): number => state.tipPosition ?? GROUP_MARKER_TIP_POSITION_DEFAULT;
