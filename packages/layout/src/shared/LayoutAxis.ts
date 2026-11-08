import type { Point, Rect } from "@jiscribe/geometry";

import { type LayoutDirection, isVerticalFlow } from "./LayoutDirection";
import type { LayoutSide } from "./types";

/**
 * The two axes of a layered layout, named by their role rather than by x / y: `along`
 * is the rank axis (y in a top-to-bottom flow), `across` the axis the nodes of one
 * rank spread on. Every stage reads coordinates through this, so none of them has to
 * branch on the direction itself.
 */
export type LayoutAxis = {
	/** The rank-axis coordinate of a point. */
	along: (point: Point) => number;
	/** The coordinate of a point across the rank axis. */
	across: (point: Point) => number;
	/** A point from its two coordinates, the across one first. */
	make: (across: number, along: number) => Point;
	/** Where a box starts along the rank axis. */
	alongStart: (bounds: Rect) => number;
	/** How far a box extends along the rank axis. */
	alongExtent: (bounds: Rect) => number;
	/** Where a box starts across the rank axis. */
	acrossStart: (bounds: Rect) => number;
	/** How far a box extends across the rank axis: the length of the sides edges meet it on. */
	acrossExtent: (bounds: Rect) => number;
	/** The centre of a box across the rank axis. */
	acrossCentre: (bounds: Rect) => number;
	/** A size's extent along the rank axis (a label's height in a top-to-bottom flow). */
	alongSize: (size: { width: number; height: number }) => number;
	/** A size's extent across the rank axis (a label's width in a top-to-bottom flow). */
	acrossSize: (size: { width: number; height: number }) => number;
	/** The side of a box that faces the next rank (`bottom` in a top-to-bottom flow). */
	aheadSide: LayoutSide;
	/** The side of a box that faces the previous rank. */
	behindSide: LayoutSide;
	/** The side of a box where it starts across the rank axis (`left` in a top-to-bottom flow). */
	acrossStartSide: LayoutSide;
	/** The side of a box where it ends across the rank axis. */
	acrossEndSide: LayoutSide;
	/** Put a point on the given rank coordinate, in place. */
	setAlong: (point: Point, along: number) => void;
	/** Move a point along the rank axis, in place. */
	shiftAlong: (point: Point, delta: number) => void;
	/** Move a box's start along the rank axis and change its extent, in place. */
	shiftBoxAlong: (
		bounds: Rect,
		startDelta: number,
		extentDelta: number,
	) => void;
};

export const createLayoutAxis = (direction: LayoutDirection): LayoutAxis => {
	const vertical = isVerticalFlow(direction);
	return {
		along: (point) => (vertical ? point.y : point.x),
		across: (point) => (vertical ? point.x : point.y),
		make: (across, along) =>
			vertical ? { x: across, y: along } : { x: along, y: across },
		alongStart: (bounds) => (vertical ? bounds.y : bounds.x),
		alongExtent: (bounds) => (vertical ? bounds.height : bounds.width),
		acrossStart: (bounds) => (vertical ? bounds.x : bounds.y),
		acrossExtent: (bounds) => (vertical ? bounds.width : bounds.height),
		acrossCentre: (bounds) =>
			vertical ? bounds.x + bounds.width / 2 : bounds.y + bounds.height / 2,
		alongSize: (size) => (vertical ? size.height : size.width),
		acrossSize: (size) => (vertical ? size.width : size.height),
		aheadSide: vertical ? "bottom" : "right",
		behindSide: vertical ? "top" : "left",
		acrossStartSide: vertical ? "left" : "top",
		acrossEndSide: vertical ? "right" : "bottom",
		setAlong: (point, along) => {
			if (vertical) {
				point.y = along;
			} else {
				point.x = along;
			}
		},
		shiftAlong: (point, delta) => {
			if (vertical) {
				point.y += delta;
			} else {
				point.x += delta;
			}
		},
		shiftBoxAlong: (bounds, startDelta, extentDelta) => {
			if (vertical) {
				bounds.y += startDelta;
				bounds.height += extentDelta;
			} else {
				bounds.x += startDelta;
				bounds.width += extentDelta;
			}
		},
	};
};
