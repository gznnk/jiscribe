import { type RouteSegment, pairKey } from "./routeSegments";
import { isSameCoordinate } from "../../shared/coordinate";

/**
 * Pairs of segments with no other between them in `order` over some stretch they
 * share, which includes each segment's nearest overlapping neighbour on either side,
 * each as indices into `segments`, the earlier in `order` first. A sweep keeps, for
 * every stretch of the run axis, the last segment seen covering it.
 *
 * @param order - Every index into `segments`
 */
export const listFacingPairs = (
	segments: readonly RouteSegment[],
	order: readonly number[],
): [number, number][] => {
	const pairs: [number, number][] = [];
	const seen = new Set<number>();
	const starts: number[] = [];
	const ends: number[] = [];
	const owners: number[] = [];
	for (const index of order) {
		const { from, to } = segments[index];
		let low = 0;
		let high = ends.length;
		while (low < high) {
			const middle = (low + high) >> 1;
			if (ends[middle] > from && !isSameCoordinate(ends[middle], from)) {
				high = middle;
			} else {
				low = middle + 1;
			}
		}
		const first = low;
		let last = first;
		while (
			last < starts.length &&
			starts[last] < to &&
			!isSameCoordinate(starts[last], to)
		) {
			const owner = owners[last];
			const key = pairKey(owner, index, segments.length);
			if (!seen.has(key)) {
				seen.add(key);
				pairs.push([owner, index]);
			}
			last += 1;
		}
		const replacing = {
			starts: [from],
			ends: [to],
			owners: [index],
		};
		if (last > first && starts[first] < from) {
			replacing.starts.unshift(starts[first]);
			replacing.ends.unshift(from);
			replacing.owners.unshift(owners[first]);
		}
		if (last > first && ends[last - 1] > to) {
			replacing.starts.push(to);
			replacing.ends.push(ends[last - 1]);
			replacing.owners.push(owners[last - 1]);
		}
		starts.splice(first, last - first, ...replacing.starts);
		ends.splice(first, last - first, ...replacing.ends);
		owners.splice(first, last - first, ...replacing.owners);
	}
	return pairs;
};
