import {
	type Channel,
	type ChannelRequest,
	IMMOVABLE,
	LEAST_LANE_SPACING,
	type RouteEnd,
	type RouteSegment,
	type RouteToNudge,
	type SegmentOnPath,
	calcChannel,
} from "./routeSegments";
import {
	ceilCoordinate,
	floorCoordinate,
	isSameCoordinate,
} from "../../shared/coordinate";
import { EDGE_END_SPACING } from "../../shared/edgeSpacing";

const NO_OWN_WALLS: ReadonlySet<number> = new Set();

/**
 * A stub's channel cut to the stretch each of its ends (both, for a straight route)
 * may slide over; immovable when that leaves it no whole px but where it stands.
 */
const cutToSlides = (
	channel: Channel,
	position: number,
	ends: readonly RouteEnd[],
): Channel => {
	const lowest = Math.max(
		channel.lowest,
		ceilCoordinate(Math.max(...ends.map(({ slide }) => slide.min))),
	);
	const highest = Math.min(
		channel.highest,
		floorCoordinate(Math.min(...ends.map(({ slide }) => slide.max))),
	);
	return lowest > highest ||
		(lowest === highest && isSameCoordinate(lowest, position))
		? IMMOVABLE
		: { lowest, highest };
};

/** The ends a route's segment is the stub of: both for a straight route. */
export const listStubEnds = ({
	route: { source, target },
	path,
	segmentIndex,
}: Pick<SegmentOnPath, "route" | "path" | "segmentIndex">): RouteEnd[] => [
	...(segmentIndex === 0 ? [source] : []),
	...(segmentIndex === path.length - 2 ? [target] : []),
];

/**
 * The channel of a segment of its route (see calcChannel), its ends' own walls left
 * out and cut to their slides (see cutToSlides) for a stub.
 */
export const calcSegmentChannel = (request: ChannelRequest): Channel => {
	const { route, segmentIndex, position } = request;
	const ends = listStubEnds({ route, path: route.path, segmentIndex });
	const channel = calcChannel(
		request,
		ends.length === 0
			? NO_OWN_WALLS
			: new Set(ends.flatMap(({ ownWallIndices }) => ownWallIndices)),
	);
	return ends.length === 0 ? channel : cutToSlides(channel, position, ends);
};

/**
 * The end gap two parallel segments keep as stubs sharing a side, the smaller of two
 * when they share two (see calcEndGaps); undefined when they share none.
 */
export const findEndGap = (
	a: Pick<RouteSegment, "sideKeys">,
	b: Pick<RouteSegment, "sideKeys">,
	endGaps: ReadonlyMap<string, number>,
): number | undefined => {
	let endGap: number | undefined;
	for (const sideKey of a.sideKeys) {
		const gap = b.sideKeys.includes(sideKey) ? endGaps.get(sideKey) : undefined;
		if (gap !== undefined && (endGap === undefined || gap < endGap)) {
			endGap = gap;
		}
	}
	return endGap;
};

/**
 * The end gap of each side two or more route ends share, by `sideKey`: the length
 * from the lowest of their slides' mins to the highest of their maxes, shared among
 * the k ends as k − 1 whole-px gaps, at most EDGE_END_SPACING and at least
 * LEAST_LANE_SPACING. A straight route is an end on each of its two sides.
 */
export const calcEndGaps = (
	routes: readonly RouteToNudge[],
): Map<string, number> => {
	const stretches = new Map<
		string,
		{ count: number; min: number; max: number }
	>();
	for (const { source, target } of routes) {
		for (const { sideKey, slide } of [source, target]) {
			const stretch = stretches.get(sideKey);
			if (stretch === undefined) {
				stretches.set(sideKey, { count: 1, ...slide });
			} else {
				stretch.count += 1;
				stretch.min = Math.min(stretch.min, slide.min);
				stretch.max = Math.max(stretch.max, slide.max);
			}
		}
	}
	const endGaps = new Map<string, number>();
	for (const [sideKey, { count, min, max }] of stretches) {
		if (count >= 2) {
			endGaps.set(
				sideKey,
				Math.max(
					LEAST_LANE_SPACING,
					Math.min(
						EDGE_END_SPACING,
						floorCoordinate((max - min) / (count - 1)),
					),
				),
			);
		}
	}
	return endGaps;
};
