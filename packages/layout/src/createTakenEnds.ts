import type { Rect } from "@jiscribe/geometry";

import {
	FULL_ANCHOR_RANGE,
	calcAnchorRangeMidpoint,
	scaleIntoAnchorRange,
} from "./anchorRange";
import { EDGE_END_SPACING } from "./chooseEdgeAnchors";
import type { LayoutAnchorRange, LayoutEdgeAnchor, LayoutSide } from "./types";

/** How far from the middle of the usable stretch a handed-out end may go, as shares of it. */
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
	 * The position on `side` of the owner nearest the middle of the side's usable
	 * stretch that keeps {@link EDGE_END_SPACING} from every end already there, kept a
	 * tenth of that stretch clear at either end, or the middle itself when nothing
	 * fits; taken from then on.
	 *
	 * @param ownerId - Matched against {@link TakenEnd.ownerId}; ends are tracked per
	 *   owner and side, so an end on another object never crowds this one
	 * @param side - The only side searched: when it is full the middle is handed out,
	 *   never a position on a neighbouring side
	 * @param box - The owner's box, for the side's length; a zero-length side
	 *   always gets the middle
	 * @param usable - The stretch of the side an end may sit on, as ratios of the
	 *   side (see `LayoutGraphNode.anchorRanges`); defaults to all of it
	 */
	place: (
		ownerId: string,
		side: LayoutSide,
		box: Rect,
		usable?: LayoutAnchorRange,
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
		place: (ownerId, side, box, usable = FULL_ANCHOR_RANGE) => {
			const extent =
				side === "top" || side === "bottom" ? box.width : box.height;
			const positions = positionsBySide.get(keyOf(ownerId, side)) ?? [];
			const gap = extent > 0 ? EDGE_END_SPACING / extent : 0;
			const isFree = (t: number): boolean =>
				positions.every((position) => Math.abs(position - t) >= gap);
			const middle = calcAnchorRangeMidpoint(usable);
			const searched = scaleIntoAnchorRange(usable, PLACE_RANGE);
			let t = middle;
			if (!isFree(middle)) {
				for (let step = gap; middle + step <= searched.max; step += gap) {
					if (isFree(middle - step)) {
						t = middle - step;
						break;
					}
					if (isFree(middle + step)) {
						t = middle + step;
						break;
					}
				}
			}
			take(ownerId, side, t);
			return { side, t };
		},
	};
};
