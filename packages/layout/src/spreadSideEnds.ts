/** One edge end on a side of a box, as the spreading sees it. */
export type SideEnd = {
	/** Position along the side, 0..1. */
	t: number;
	/** Whether the edge runs straight out of this end, so moving it would bend the edge. */
	isStraight: boolean;
};

/**
 * Open up the ends of a side that sit closer than `minimumGap` to each other, by
 * moving the end whose edge bends anyway and a straight one only when both are
 * (then each by half). Pure: the input is left alone.
 *
 * @param ends - The ends on one side, in any order
 * @param extent - Length of the side in px, which turns `minimumGap` into a ratio
 * @param minimumGap - Least distance in px two ends may have
 * @returns The ends' new positions, by the same index as `ends`, each within 0..1
 */
export const spreadSideEnds = (
	ends: readonly SideEnd[],
	extent: number,
	minimumGap: number,
): number[] => {
	const positions = ends.map(({ t }) => t);
	if (ends.length < 2 || extent <= 0) {
		return positions;
	}
	const gap = minimumGap / extent;
	const clamp = (value: number): number => Math.min(1, Math.max(0, value));
	// A push can open a new overlap with the next end over; a few passes settle it.
	for (let pass = 0; pass < 8; pass += 1) {
		const order = positions
			.map((_, index) => index)
			.sort((a, b) => positions[a] - positions[b]);
		for (let rank = 1; rank < order.length; rank += 1) {
			const lower = order[rank - 1];
			const upper = order[rank];
			const shortfall = gap - (positions[upper] - positions[lower]);
			if (shortfall <= 0) {
				continue;
			}
			if (ends[lower].isStraight === ends[upper].isStraight) {
				positions[lower] = clamp(positions[lower] - shortfall / 2);
				positions[upper] = clamp(positions[upper] + shortfall / 2);
			} else if (ends[lower].isStraight) {
				positions[upper] = clamp(positions[upper] + shortfall);
			} else {
				positions[lower] = clamp(positions[lower] - shortfall);
			}
		}
	}
	return positions;
};
