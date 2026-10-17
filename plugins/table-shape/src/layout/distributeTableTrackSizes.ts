import { PRECISION } from "@jiscribe/canvas-sdk";
import { roundToDecimal } from "@jiscribe/geometry";

/**
 * One track's share of the size left to hand out. Tracks of zero size — which
 * only a set summing to zero can have — split it evenly instead, there being no
 * proportion to keep.
 */
const calcTrackShare = (
	startSize: number,
	freeSize: number,
	freeTotal: number,
	freeCount: number,
): number =>
	freeTotal > 0 ? (startSize / freeTotal) * freeSize : freeSize / freeCount;

/**
 * What is left for the tracks that are not pinned: the size the pinned ones do
 * not already claim at their floors, how much of the starting sizes the rest hold
 * between them, and how many they are. The one statement of that budget, because
 * the pass that decides the pinning and the pass that hands out the sizes have to
 * read the same one — a share computed against a different budget would pin a
 * track and then give it something else.
 */
const calcFreeBudget = (
	startSizes: readonly number[],
	floors: readonly number[],
	total: number,
	pinned: readonly boolean[],
): { freeSize: number; freeTotal: number; freeCount: number } => {
	let freeSize = total;
	let freeTotal = 0;
	let freeCount = 0;
	startSizes.forEach((startSize, index) => {
		if (!pinned[index]) {
			freeTotal += startSize;
			freeCount++;
		} else {
			freeSize -= floors[index];
		}
	});
	return { freeSize, freeTotal, freeCount };
};

/**
 * Which tracks end up at their floor rather than at their share. Pinning one
 * lowers every other track's share — it gives up less than its proportion asked
 * of it — so a pass can uncover more, and the passes repeat until none does. At
 * most one pass per track. A total below the floors summed pins every track, no
 * set of shares then reaching its floors.
 *
 * @returns One flag per track, by index, true where the track is pinned
 */
const calcPinnedFlags = (
	startSizes: readonly number[],
	floors: readonly number[],
	total: number,
): boolean[] => {
	const pinned = startSizes.map(() => false);
	let budget = calcFreeBudget(startSizes, floors, total, pinned);

	let pinnedMore = true;
	while (pinnedMore) {
		pinnedMore = false;
		startSizes.forEach((startSize, index) => {
			if (
				pinned[index] ||
				calcTrackShare(
					startSize,
					budget.freeSize,
					budget.freeTotal,
					budget.freeCount,
				) >= floors[index]
			) {
				return;
			}
			pinned[index] = true;
			pinnedMore = true;
		});
		if (pinnedMore) {
			budget = calcFreeBudget(startSizes, floors, total, pinned);
		}
	}
	return pinned;
};

/**
 * Gives the rounding residue to the tracks not pinned at their floor, largest
 * first. A positive residue all goes to the largest; a negative one takes each
 * track down at most to its floor and carries the rest on, since shares rounded
 * up together can overshoot by more than any one track holds above its floor.
 *
 * @param sizes - Rounded sizes, one per track; rewritten in place
 */
const spreadRoundingResidue = (
	sizes: number[],
	floors: readonly number[],
	pinned: readonly boolean[],
	residue: number,
): void => {
	const freeIndices = sizes
		.map((_, index) => index)
		.filter((index) => !pinned[index])
		.sort((left, right) => sizes[right] - sizes[left]);
	let remaining = roundToDecimal(residue, PRECISION.SIZE);
	for (const index of freeIndices) {
		if (remaining === 0) {
			return;
		}
		const taken = Math.max(remaining, floors[index] - sizes[index]);
		sizes[index] = roundToDecimal(sizes[index] + taken, PRECISION.SIZE);
		remaining = roundToDecimal(remaining - taken, PRECISION.SIZE);
	}
};

/**
 * The sizes a run of tracks totalling `total` is made of, each keeping the share
 * of the total it holds now — the one rule both an outer-frame resize's width
 * (distributeTableWidthToColumns) and its height (distributeTableHeightToRows)
 * are turned into tracks by.
 *
 * **No track goes under its floor.** One whose share would is pinned there and
 * what that costs comes off the rest, in their own proportions. A total below the
 * floors summed cannot be met: every track is pinned and the run is built at its
 * floors instead.
 *
 * Sizes are rounded to `PRECISION.SIZE`, as a document stores them, and the
 * residue the rounding leaves is handed back, largest unpinned track first, so the
 * run sums to what was asked to within that precision and the box derived from it
 * is the one the drag put there.
 *
 * @param startSizes - The tracks' sizes as of the write, in order; the proportions kept
 * @param floors - One lower bound per track, by index
 * @param total - Size the run is to sum to, in local px
 * @returns One size per track, by index, each at or above its floor; an empty array for no tracks
 */
export const distributeTableTrackSizes = (
	startSizes: readonly number[],
	floors: readonly number[],
	total: number,
): number[] => {
	const pinned = calcPinnedFlags(startSizes, floors, total);
	const { freeSize, freeTotal, freeCount } = calcFreeBudget(
		startSizes,
		floors,
		total,
		pinned,
	);

	const sizes = startSizes.map((startSize, index) =>
		roundToDecimal(
			pinned[index]
				? floors[index]
				: calcTrackShare(startSize, freeSize, freeTotal, freeCount),
			PRECISION.SIZE,
		),
	);
	// With every track pinned the run is its floors and there is no total to meet.
	if (freeCount > 0) {
		const rounded = sizes.reduce((sum, size) => sum + size, 0);
		spreadRoundingResidue(sizes, floors, pinned, total - rounded);
	}
	return sizes;
};
