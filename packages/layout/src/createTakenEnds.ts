import type { Rect } from "@jiscribe/geometry";

import { EDGE_END_SPACING } from "./chooseEdgeAnchors";
import type { LayoutEdgeAnchor, LayoutSide } from "./types";

/** An end already sitting on a side of an object. */
export type TakenEnd = {
	/** Id of the object the end sits on. */
	ownerId: string;
	side: LayoutSide;
	/** Position along the side, 0..1 as in {@link LayoutEdgeAnchor}. */
	t: number;
};

/** Hands out free positions on the sides of objects; see {@link createTakenEnds}. */
export type TakenEnds = {
	/**
	 * The position on `side` of the owner nearest the side's midpoint that keeps
	 * {@link EDGE_END_SPACING} from every end already there, within a tenth of the side
	 * at either end, or the midpoint itself when nothing fits; taken from then on.
	 *
	 * @param ownerId - Matched against {@link TakenEnd.ownerId}; ends are tracked per
	 *   owner and side, so an end on another object never crowds this one
	 * @param side - The only side searched: when it is full the midpoint is handed out,
	 *   never a position on a neighbouring side
	 * @param box - The owner's box, for the side's length; a zero-length side
	 *   always gets the midpoint
	 */
	place: (ownerId: string, side: LayoutSide, box: Rect) => LayoutEdgeAnchor;
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
		place: (ownerId, side, box) => {
			const extent =
				side === "top" || side === "bottom" ? box.width : box.height;
			const positions = positionsBySide.get(keyOf(ownerId, side)) ?? [];
			const gap = extent > 0 ? EDGE_END_SPACING / extent : 0;
			const isFree = (t: number): boolean =>
				positions.every((position) => Math.abs(position - t) >= gap);
			let t = 0.5;
			if (!isFree(0.5)) {
				for (let step = gap; 0.5 + step <= 0.9; step += gap) {
					if (isFree(0.5 - step)) {
						t = 0.5 - step;
						break;
					}
					if (isFree(0.5 + step)) {
						t = 0.5 + step;
						break;
					}
				}
			}
			take(ownerId, side, t);
			return { side, t };
		},
	};
};
