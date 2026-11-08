import type { Rect } from "@jiscribe/geometry";

import { EDGE_END_SPACING } from "./chooseEdgeAnchors";
import {
	FULL_ANCHOR_RANGE,
	calcCentredAnchorRatio,
	scaleIntoBodyWithinUsable,
} from "../shared/anchorRange";
import type {
	LayoutAnchorRange,
	LayoutEdgeAnchor,
	LayoutSide,
} from "../shared/types";

/**
 * Where on a side a handed-out end may go, as shares of the side's body, cut down to
 * its usable stretch (see scaleIntoBodyWithinUsable).
 */
const PLACE_RANGE: LayoutAnchorRange = { min: 0.1, max: 0.9 };

/** An end already sitting on a side of an object. */
export type TakenEnd = {
	/** Id of the object the end sits on. */
	ownerId: string;
	side: LayoutSide;
	/**
	 * Position along the side, 0..1 as in {@link LayoutEdgeAnchor}: a ratio of the box's
	 * side, the one the layout hands out, so an end stored as a ratio of some other
	 * stretch has to be given back in this one.
	 */
	t: number;
};

/** Hands out free positions on the sides of objects; see {@link createTakenEnds}. */
export type TakenEnds = {
	/**
	 * The position on `side` of the owner nearest where a side's only end would sit
	 * (the middle of `body`, or of `usable` when that is off it) that keeps
	 * {@link EDGE_END_SPACING} from every end already there, searched below and
	 * above it, the lower first at each step, within a tenth of `body` clear at either
	 * end and within `usable`; that starting position itself when nothing fits. Taken
	 * from then on.
	 *
	 * @param ownerId - Matched against {@link TakenEnd.ownerId}; ends are tracked per
	 *   owner and side, so an end on another object never crowds this one
	 * @param side - The only side searched: when it is full the starting position is
	 *   handed out, never a position on a neighbouring side
	 * @param box - The owner's box, for the side's length; a zero-length side
	 *   always gets the starting position
	 * @param usable - The stretch of the side an end may sit on, as ratios of the
	 *   side (see `LayoutGraphNode.anchorRanges`); defaults to all of it
	 * @param body - The stretch of the side the owner's body covers, as ratios of the
	 *   side (see `LayoutGraphNode.anchorBodyRanges`); defaults to all of it. Where it
	 *   and `usable` share nothing past the clear tenths, the search runs over
	 *   `usable`'s middle eight tenths instead
	 */
	place: (
		ownerId: string,
		side: LayoutSide,
		box: Rect,
		usable?: LayoutAnchorRange,
		body?: LayoutAnchorRange,
	) => LayoutEdgeAnchor;
};

/**
 * Where ends already sit on each side of each object, so a line added after the layout
 * can land clear of them.
 *
 * @param taken - The ends already in place, in any order; the list is copied, so later
 *   changes to it are not seen. Each {@link TakenEnds.place} adds the end it hands out
 */
export const createTakenEnds = (taken: readonly TakenEnd[]): TakenEnds => {
	const positionsBySide = new Map<string, number[]>();
	const keyOf = (ownerId: string, side: LayoutSide): string =>
		`${ownerId}:${side}`;
	const take = (ownerId: string, side: LayoutSide, t: number): void => {
		const key = keyOf(ownerId, side);
		const positions = positionsBySide.get(key);
		if (positions === undefined) {
			positionsBySide.set(key, [t]);
		} else {
			positions.push(t);
		}
	};
	for (const { ownerId, side, t } of taken) {
		take(ownerId, side, t);
	}
	return {
		place: (
			ownerId,
			side,
			box,
			usable = FULL_ANCHOR_RANGE,
			body = FULL_ANCHOR_RANGE,
		) => {
			const extent =
				side === "top" || side === "bottom" ? box.width : box.height;
			const positions = positionsBySide.get(keyOf(ownerId, side)) ?? [];
			const gap = extent > 0 ? EDGE_END_SPACING / extent : 0;
			const isFree = (t: number): boolean =>
				positions.every((position) => Math.abs(position - t) >= gap);
			const searched = scaleIntoBodyWithinUsable(body, usable, PLACE_RANGE);
			const start = Math.min(
				searched.max,
				Math.max(searched.min, calcCentredAnchorRatio(body, usable)),
			);
			// The lower limit mirrored above the start, so both sides are tested by the
			// same `start + step` and a start centred on the stretch runs out of both at
			// the same step: `start - step >= min` rounds differently (0.5 - 0.4 >= 0.1
			// is false while 0.5 + 0.4 <= 0.9 is true).
			const lowerReach = 2 * start - searched.min;
			let t = start;
			if (gap > 0 && !isFree(start)) {
				for (let step = gap; ; step += gap) {
					const hasLower = start + step <= lowerReach;
					const hasUpper = start + step <= searched.max;
					if (!hasLower && !hasUpper) {
						break;
					}
					if (hasLower && isFree(start - step)) {
						t = start - step;
						break;
					}
					if (hasUpper && isFree(start + step)) {
						t = start + step;
						break;
					}
				}
			}
			take(ownerId, side, t);
			return { side, t };
		},
	};
};
