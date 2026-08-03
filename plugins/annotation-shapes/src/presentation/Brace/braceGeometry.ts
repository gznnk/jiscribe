import type { Point } from "@workspace/geometry";

import type { BraceDirection } from "../../schema/brace/BraceDoc";
import {
	BRACE_DIRECTION_DEFAULT,
	BRACE_TIP_POSITION_DEFAULT,
} from "../../schema/brace/BraceDoc";

/** The two axes of a brace's box, named by role rather than by x / y. */
export type BraceAxes = {
	/** How far the curve bulges out from the arms: the box's side along the direction. */
	depth: number;
	/** How far the arms reach: the box's side across the direction. */
	span: number;
};

/** Whether the brace runs top-to-bottom (its arms reach a vertical edge). */
export const isVerticalBrace = (direction: BraceDirection): boolean =>
	direction === "left" || direction === "right";

/**
 * Splits a box into the brace's two axes. A left/right brace bulges across the
 * width and reaches along the height; an up/down one is the other way round.
 *
 * @param width Box width in local px.
 * @param height Box height in local px.
 * @param direction Which way the tip points.
 * @returns The depth and span the path is built from.
 */
export const calcBraceAxes = (
	width: number,
	height: number,
	direction: BraceDirection,
): BraceAxes =>
	isVerticalBrace(direction)
		? { depth: width, span: height }
		: { depth: height, span: width };

/**
 * Maps a point from the canonical brace space — tip at x = 0, arms at
 * x = depth, span running along y — onto the box whose top-left corner is at
 * (x, y). Every direction is this one construction seen from a different side,
 * so the path, the tip and the label anchor cannot drift apart.
 *
 * @param point The canonical point; x in [0, depth], y in [0, span].
 * @param x Left edge of the box in local coordinates.
 * @param y Top edge of the box in local coordinates.
 * @param width Box width.
 * @param height Box height.
 * @param direction Which way the tip points.
 * @returns The same point in the box's coordinates.
 */
export const mapCanonicalBracePoint = (
	point: Point,
	x: number,
	y: number,
	width: number,
	height: number,
	direction: BraceDirection,
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
 * turn at.
 *
 * @param x Left edge of the box in local coordinates.
 * @param y Top edge of the box in local coordinates.
 * @param width Box width.
 * @param height Box height.
 * @param direction Which way the tip points; the tip lands on that edge.
 * @param tipPosition 0..1 along the span; values outside the range are the caller's to reject.
 * @returns The tip in the box's coordinates.
 */
export const calcBraceTip = (
	x: number,
	y: number,
	width: number,
	height: number,
	direction: BraceDirection,
	tipPosition: number,
): Point => {
	const { span } = calcBraceAxes(width, height, direction);
	return mapCanonicalBracePoint(
		{ x: 0, y: tipPosition * span },
		x,
		y,
		width,
		height,
		direction,
	);
};

/** Reads the direction off a state that may leave it out. */
export const resolveBraceDirection = (state: {
	direction?: BraceDirection;
}): BraceDirection => state.direction ?? BRACE_DIRECTION_DEFAULT;

/** Reads the tip position off a state that may leave it out. */
export const resolveBraceTipPosition = (state: {
	tipPosition?: number;
}): number => state.tipPosition ?? BRACE_TIP_POSITION_DEFAULT;
