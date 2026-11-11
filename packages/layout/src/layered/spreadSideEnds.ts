import { FULL_ANCHOR_RANGE } from "../shared/anchorRange";
import type { LayoutAnchorRange } from "../shared/types";

/** One edge end on a side of a box, as the spreading sees it. */
export type SideEnd = {
	/** Position along the side, 0..1, as the anchor rules chose it. */
	t: number;
	/**
	 * Where along the side the edge is headed, as a ratio of the side's extent and
	 * without a clamp: below 0 or above 1 for an edge that turns toward a box beside
	 * the side. Ends are kept in this order, so edges leaving one side never cross.
	 */
	heading: number;
};

/**
 * Open up the ends of a side that sit closer than `minimumGap` to each other, in the
 * order of their headings: an end is moved on only as far as the one before it makes
 * it, and the stack is moved back when it would run past the end of the side's usable
 * stretch. Pure: the input is left alone.
 *
 * @param ends - The ends on one side, in any order
 * @param extent - Length of the side in px, which turns `minimumGap` into a ratio
 * @param minimumGap - Least distance in px two ends may have
 * @param usable - The stretch of the side the ends may sit on, as ratios of the whole
 *   side; defaults to all of it. A stack too wide for it keeps the gaps it can and
 *   piles the rest against its start
 * @returns The ends' new positions, by the same index as `ends`, each within `usable`
 */
export const spreadSideEnds = (
	ends: readonly SideEnd[],
	extent: number,
	minimumGap: number,
	usable: LayoutAnchorRange = FULL_ANCHOR_RANGE,
): number[] => {
	const positions = ends.map(({ t }) => t);
	if (ends.length < 2 || extent <= 0) {
		return positions;
	}
	const gap = minimumGap / extent;
	const order = positions
		.map((_, index) => index)
		.sort(
			(a, b) =>
				ends[a].heading - ends[b].heading || ends[a].t - ends[b].t || a - b,
		);
	// Forward: each end sits no earlier than a gap after the one before it.
	for (let rank = 1; rank < order.length; rank += 1) {
		const previous = positions[order[rank - 1]];
		positions[order[rank]] = Math.max(positions[order[rank]], previous + gap);
	}
	// Backward: pull the stack back from past the usable end, keeping the gaps.
	positions[order[order.length - 1]] = Math.min(
		usable.max,
		positions[order[order.length - 1]],
	);
	for (let rank = order.length - 2; rank >= 0; rank -= 1) {
		const next = positions[order[rank + 1]];
		positions[order[rank]] = Math.min(positions[order[rank]], next - gap);
	}
	return positions.map((position) => Math.max(usable.min, position));
};
