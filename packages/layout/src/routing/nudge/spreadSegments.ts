import type { Point } from "@jiscribe/geometry";

import { decideOrder } from "./decideOrder";
import { listFacingPairs } from "./listFacingPairs";
import { orderTopologically } from "./orderTopologically";
import { calcSegmentChannel, findEndGap, listStubEnds } from "./routeEnds";
import {
	type Channel,
	LEAST_LANE_SPACING,
	type NudgePass,
	type RouteSegment,
	type SegmentMember,
	acrossOf,
	calcOverlap,
	calcSegmentSpan,
	isAlongside,
	isImmovable,
	isOfOneBundle,
	listSegmentMembers,
	pairKey,
	walkAllSegments,
} from "./routeSegments";
import {
	type SeparationConstraint,
	type SeparationVariable,
	solveSeparation,
} from "./solveSeparation";
import {
	ceilCoordinate,
	floorCoordinate,
	isAtLeast,
	isSameCoordinate,
} from "../../shared/coordinate";
import { EDGE_END_SPACING, GAP_LANE_SPACING } from "../../shared/edgeSpacing";

/**
 * How far apart in px two segments may stand for the pair scan to look at them: the
 * widest gap either a lane or an end pair keeps.
 */
const PAIR_SCAN_SPACING = Math.max(GAP_LANE_SPACING, EDGE_END_SPACING);

/**
 * How near in px a run moved sideways, or the piece the move adds to a neighbour, may
 * come to a box or border side, unless it already ran nearer.
 */
const WALL_CLEARANCE = GAP_LANE_SPACING / 2;

/**
 * The gap in px two parallel segments of one route joined by a single segment keep at
 * the least, or the gap they had when it is less, so the segment between them never
 * folds.
 */
const LEAST_FOLD_GAP = 1;

/**
 * How many times the decided order is made again for facing pairs found standing
 * against it, before the groups they fall in settle for their current order.
 */
const MAX_DECIDED_ORDER_ROUNDS = 4;

/**
 * - `conflict`: closer than the lane spacing (an end pair's end gap) over a shared
 *   stretch; ordered by decideOrder and kept the spacing apart
 * - `order`: further apart, but able to come closer; kept in their current order
 * - `fold`: two segments of one route with a single segment between them, which
 *   must not fold
 */
type SegmentPairKind = "conflict" | "order" | "fold";

type SegmentPair = {
	/** The one first in the current order: an index into the sorted segments. */
	first: number;
	/** The one later in the current order. */
	second: number;
	kind: SegmentPairKind;
	/**
	 * The gap an `order` or `fold` pair keeps, an end pair's cut to the group's end cap
	 * as well; a conflict keeps its group's spacing.
	 */
	gap: number;
	/** Whether decideOrder puts a conflict's `second` on the low side; false otherwise. */
	isSwapped: boolean;
	/**
	 * For two stubs sharing a side, the end gap of that side (the smaller of two): a
	 * conflict then keeps it apart, or the group's end cap when that is less. Undefined
	 * for every other pair, and for a conflict kept as it stands (see toOrderPair).
	 */
	endGap: number | undefined;
};

/**
 * `segment`'s channel bounded so it stays on its own side of `partner`, the
 * coordinate of a parallel segment of its route with a single segment between them,
 * LEAST_FOLD_GAP off or as near as it stands, so the segment between them never folds.
 *
 * @param isPartnerAfter - Whether the partner comes later along the path
 */
const keepFromFolding = (
	segment: RouteSegment,
	partner: number,
	isPartnerAfter: boolean,
): Channel => {
	const { position, lowest, highest } = segment;
	const difference = isPartnerAfter ? partner - position : position - partner;
	const gap = Math.min(LEAST_FOLD_GAP, Math.abs(difference));
	return difference >= 0 === isPartnerAfter
		? { lowest, highest: Math.min(highest, floorCoordinate(partner - gap)) }
		: { lowest: Math.max(lowest, ceilCoordinate(partner + gap)), highest };
};

/** Whether each end's stub of one route may move, as applyFoldBounds is to read it. */
type StubMobility = { canSourceMove: boolean; canTargetMove: boolean };

/**
 * Whether each stub of a route may move, judged before any fold bound is applied to
 * any route: a segment merged across routes (see mergeBundledSegments) is one route's
 * stub and another's inner segment, so a bound applied for one would decide the other.
 *
 * @param bySegmentIndex - The route's segments along the axis, by their index along
 *   the route, a merged one under each of its members' indices
 */
const readStubMobility = (
	path: readonly Point[],
	bySegmentIndex: ReadonlyMap<number, RouteSegment>,
): StubMobility => {
	const sourceStub = bySegmentIndex.get(0);
	const targetStub = bySegmentIndex.get(path.length - 2);
	return {
		canSourceMove: sourceStub !== undefined && !isImmovable(sourceStub),
		canTargetMove: targetStub !== undefined && !isImmovable(targetStub),
	};
};

/**
 * Bound one route's segments so none folds the one between it and its partner two
 * on, where no fold pair (see listSegmentPairs) will: segment 2 by the source end and
 * segment last − 3 by the target end, when that end's stub cannot move; and a stub
 * that can by its partner, when the partner cannot. Whether a stub can move is
 * judged before any of these bounds (see readStubMobility), so neither stub of a Z
 * route decides the other.
 *
 * @param bySegmentIndex - The route's segments along the axis, by their index along
 *   the route, a merged one under each of its members' indices; updated in place
 */
const applyFoldBounds = (
	path: readonly Point[],
	bySegmentIndex: ReadonlyMap<number, RouteSegment>,
	isVertical: boolean,
	{ canSourceMove, canTargetMove }: StubMobility,
): void => {
	const last = path.length - 1;
	const sourceStub = bySegmentIndex.get(0);
	const targetStub = bySegmentIndex.get(last - 1);
	const afterSource = bySegmentIndex.get(2);
	const beforeTarget = bySegmentIndex.get(last - 3);
	if (afterSource !== undefined && !canSourceMove) {
		Object.assign(
			afterSource,
			keepFromFolding(afterSource, acrossOf(path[0], isVertical), false),
		);
	}
	if (beforeTarget !== undefined && !canTargetMove) {
		Object.assign(
			beforeTarget,
			keepFromFolding(beforeTarget, acrossOf(path[last], isVertical), true),
		);
	}
	if (
		canSourceMove &&
		sourceStub !== undefined &&
		afterSource !== undefined &&
		isImmovable(afterSource)
	) {
		Object.assign(
			sourceStub,
			keepFromFolding(sourceStub, afterSource.position, true),
		);
	}
	if (
		canTargetMove &&
		targetStub !== undefined &&
		beforeTarget !== undefined &&
		isImmovable(beforeTarget)
	) {
		Object.assign(
			targetStub,
			keepFromFolding(targetStub, beforeTarget.position, false),
		);
	}
};

/**
 * Every segment of every route running along the axis, each with the room it has to
 * move before any other segment is counted in, in the current order: by position,
 * then by route, then along the route. A stub may move only along its side, within
 * its ends' slides.
 */
const collectRouteSegments = ({
	routes,
	borders,
	isVertical,
}: NudgePass): RouteSegment[] => {
	const segments: RouteSegment[] = [];
	walkAllSegments(routes, { isVertical }, (segmentOnPath) => {
		const { route, routeIndex, segmentIndex } = segmentOnPath;
		const span = calcSegmentSpan(segmentOnPath, isVertical);
		segments.push({
			routeIndex,
			segmentIndex,
			...span,
			...calcSegmentChannel({
				route,
				segmentIndex,
				...span,
				borders,
				isVertical,
				clearance: WALL_CLEARANCE,
			}),
			sideKeys: listStubEnds(segmentOnPath).map(({ sideKey }) => sideKey),
		});
	});
	return segments.sort(
		(a, b) =>
			a.position - b.position ||
			a.routeIndex - b.routeIndex ||
			a.segmentIndex - b.segmentIndex,
	);
};

/**
 * `segments` (sorted by position) with the segments of one bundle that lie on one
 * line made one: two segments of different routes merge when their routes share a
 * bundle key (see RouteToNudge.bundleKeys) and they share or touch a stretch, and
 * merging is transitive, so a chain of such pairs ends up one segment whether or not
 * its two ends share a key. The first of them in the order stands for the rest (see
 * RouteSegment.members): over the stretch they cover together, within the room every
 * one of them has (immovable when one is), with the side keys of them all.
 */
const mergeBundledSegments = (
	segments: readonly RouteSegment[],
	{ routes }: NudgePass,
): RouteSegment[] => {
	const isBundledWith = (a: RouteSegment, b: RouteSegment): boolean =>
		a.routeIndex !== b.routeIndex &&
		isOfOneBundle(routes[a.routeIndex], routes[b.routeIndex]) &&
		isAtLeast(calcOverlap(a, b), 0);
	const parents = segments.map((_, index) => index);
	const findRoot = (index: number): number => {
		let root = index;
		while (parents[root] !== root) {
			root = parents[root];
		}
		return root;
	};
	let hasBundle = false;
	for (let first = 0; first < segments.length; first += 1) {
		for (
			let second = first + 1;
			second < segments.length &&
			isSameCoordinate(segments[second].position, segments[first].position);
			second += 1
		) {
			if (isBundledWith(segments[first], segments[second])) {
				const rootOfFirst = findRoot(first);
				const rootOfSecond = findRoot(second);
				if (rootOfFirst !== rootOfSecond) {
					parents[Math.max(rootOfFirst, rootOfSecond)] = Math.min(
						rootOfFirst,
						rootOfSecond,
					);
					hasBundle = true;
				}
			}
		}
	}
	if (!hasBundle) {
		return [...segments];
	}
	const toMember = ({
		routeIndex,
		segmentIndex,
		from,
		to,
	}: RouteSegment): SegmentMember => ({ routeIndex, segmentIndex, from, to });
	const merged = new Map<number, RouteSegment>();
	segments.forEach((segment, index) => {
		const root = findRoot(index);
		const lead = merged.get(root);
		if (lead === undefined) {
			merged.set(root, { ...segment });
			return;
		}
		const isFixed = isImmovable(lead) || isImmovable(segment);
		lead.members = [...(lead.members ?? [toMember(lead)]), toMember(segment)];
		lead.from = Math.min(lead.from, segment.from);
		lead.to = Math.max(lead.to, segment.to);
		lead.lowest = isFixed ? Infinity : Math.max(lead.lowest, segment.lowest);
		lead.highest = isFixed
			? -Infinity
			: Math.min(lead.highest, segment.highest);
		lead.sideKeys = [...new Set([...lead.sideKeys, ...segment.sideKeys])];
	});
	return [...merged.values()];
};

/**
 * Every segment running along the axis as the spreading takes it, in the current
 * order (see collectRouteSegments): the segments of one bundle on one line merged
 * (see mergeBundledSegments), then each route's fold bounds applied on what that
 * left (see applyFoldBounds).
 */
const collectSegments = (pass: NudgePass): RouteSegment[] => {
	const { routes, isVertical } = pass;
	const segments = mergeBundledSegments(collectRouteSegments(pass), pass);
	const byRoute = routes.map(() => new Map<number, RouteSegment>());
	for (const segment of segments) {
		for (const { routeIndex, segmentIndex } of listSegmentMembers(segment)) {
			byRoute[routeIndex].set(segmentIndex, segment);
		}
	}
	const mobilities = routes.map(({ path }, routeIndex) =>
		readStubMobility(path, byRoute[routeIndex]),
	);
	routes.forEach(({ path }, routeIndex) => {
		applyFoldBounds(
			path,
			byRoute[routeIndex],
			isVertical,
			mobilities[routeIndex],
		);
	});
	return segments;
};

const isFoldPair = (a: RouteSegment, b: RouteSegment): boolean =>
	listSegmentMembers(a).some((memberOfA) =>
		listSegmentMembers(b).some(
			(memberOfB) =>
				memberOfA.routeIndex === memberOfB.routeIndex &&
				Math.abs(memberOfA.segmentIndex - memberOfB.segmentIndex) === 2,
		),
	);

/**
 * Whether two parallel segments, at least one movable, run closer than the lane
 * spacing, or than `endGap` for an end pair, over a shared stretch (see isAlongside).
 */
const isConflicting = (
	a: RouteSegment,
	b: RouteSegment,
	endGap: number | undefined,
): boolean => {
	return (
		!(isImmovable(a) && isImmovable(b)) &&
		!isFoldPair(a, b) &&
		Math.abs(a.position - b.position) < (endGap ?? GAP_LANE_SPACING) &&
		isAlongside(a, b)
	);
};

/**
 * Every pair the spreading must keep apart, each as indices into `segments` (sorted by
 * position): the conflicting pairs, with the order decideOrder sets them in;
 * each route's segments with one segment between them, both movable; and the facing
 * pairs (see listFacingPairs) whose room to move lets them come nearer than they keep,
 * facing in the current order or in the decided one, where a conflict turned round
 * can bring two others face to face. A pair neither of which may move is left out.
 * Two stubs sharing a side are an end pair, held to the side's end gap in place of
 * the lane spacing.
 */
const listSegmentPairs = (
	segments: readonly RouteSegment[],
	pass: NudgePass,
): SegmentPair[] => {
	const { endGaps } = pass;
	const pairs: SegmentPair[] = [];
	const decidedEdges: [number, number][] = [];
	const pairKeys = new Set<number>();
	const addPair = (pair: SegmentPair): void => {
		const { first, second, isSwapped } = pair;
		pairKeys.add(pairKey(first, second, segments.length));
		pairs.push(pair);
		decidedEdges.push(isSwapped ? [second, first] : [first, second]);
	};
	for (let first = 0; first < segments.length; first += 1) {
		for (
			let second = first + 1;
			second < segments.length &&
			segments[second].position - segments[first].position < PAIR_SCAN_SPACING;
			second += 1
		) {
			const a = segments[first];
			const b = segments[second];
			const endGap = findEndGap(a, b, endGaps);
			if (isConflicting(a, b, endGap)) {
				addPair({
					first,
					second,
					kind: "conflict",
					gap: 0,
					isSwapped: decideOrder(a, b, pass) > 0,
					endGap,
				});
			}
		}
	}
	const indexByKey = new Map<string, number>();
	segments.forEach((segment, index) => {
		for (const { routeIndex, segmentIndex } of listSegmentMembers(segment)) {
			indexByKey.set(`${routeIndex}:${segmentIndex}`, index);
		}
	});
	segments.forEach((segment, index) => {
		for (const member of listSegmentMembers(segment)) {
			const partner = indexByKey.get(
				`${member.routeIndex}:${member.segmentIndex + 2}`,
			);
			if (
				partner === undefined ||
				partner === index ||
				isImmovable(segment) ||
				isImmovable(segments[partner])
			) {
				continue;
			}
			const [first, second] =
				index < partner ? [index, partner] : [partner, index];
			if (pairKeys.has(pairKey(first, second, segments.length))) {
				continue;
			}
			addPair({
				first,
				second,
				isSwapped: false,
				kind: "fold",
				gap: Math.min(
					LEAST_FOLD_GAP,
					segments[second].position - segments[first].position,
				),
				endGap: undefined,
			});
		}
	});
	const lowestOf = (segment: RouteSegment): number =>
		isImmovable(segment)
			? segment.position
			: Math.min(segment.position, segment.lowest);
	const highestOf = (segment: RouteSegment): number =>
		isImmovable(segment)
			? segment.position
			: Math.max(segment.position, segment.highest);
	/** Whether a pair it adds stands against `order`, which must then be made again. */
	const addFacingPairs = (order: readonly number[]): boolean => {
		let isReversed = false;
		for (const [one, other] of listFacingPairs(segments, order)) {
			const [first, second] = one < other ? [one, other] : [other, one];
			const a = segments[first];
			const b = segments[second];
			if (
				pairKeys.has(pairKey(first, second, segments.length)) ||
				(isImmovable(a) && isImmovable(b)) ||
				isFoldPair(a, b)
			) {
				continue;
			}
			const endGap = findEndGap(a, b, endGaps);
			const gap = Math.min(endGap ?? GAP_LANE_SPACING, b.position - a.position);
			if (
				highestOf(a) + gap > lowestOf(b) &&
				!isSameCoordinate(highestOf(a) + gap, lowestOf(b))
			) {
				addPair({
					first,
					second,
					kind: "order",
					gap,
					isSwapped: false,
					endGap,
				});
				isReversed ||= one !== first;
			}
		}
		return isReversed;
	};
	addFacingPairs(segments.map((_, index) => index));
	for (let round = 0; ; round += 1) {
		// A cycle is broken at its earliest segment, which takes back a conflict's
		// decided order and never a pair's current one, those all running forward.
		const decidedOrder = orderTopologically(segments.length, decidedEdges);
		if (round === MAX_DECIDED_ORDER_ROUNDS || !addFacingPairs(decidedOrder)) {
			return pairs;
		}
	}
};

/**
 * Whole-px positions for a group's members, the pairs set in the order of `sequence`
 * (every pair's segment earlier in it on the low side), the conflicting ones at
 * least `spacing` apart, and the end pairs at least their own gap or `endCap`,
 * whichever is less. A member may stay where it stands or move to any whole px of
 * its channel. Going back from the last place, each takes the greatest position its
 * pairs with the places after it leave; then going on from the first, each takes the
 * one nearest the solver's that its pairs with the places before it leave, below its
 * greatest, which such a position always is. A place left no greatest is where the
 * group does not fit: following from it the pairs that held each place down, the
 * first conflict met is the one in the way, and there always is one, as the pairs
 * but conflicts all leave every segment room to stand where it stands. A member that
 * keeps its position keeps its coordinate exactly.
 *
 * @param sequence - Every segment the pairs name, as indices into `segments`
 * @param endCap - Caps the least separation of an end pair: a conflicting one keeps
 *   at least the lesser of this and its end gap, an order one the lesser of this and
 *   its own gap
 * @param members - The movable segments that may move here; every other one the
 *   pairs name stands at its entry in `positions`
 * @returns The new position of each member that moves, by its index; for a group
 *   that does not fit, the conflict in the way; undefined when `sequence` reverses a
 *   pair that must keep its own order
 * @throws Error for a group that does not fit with no conflict in the way, which the
 *   pairs it is given never make
 */
const arrangeGroup = (
	segments: readonly RouteSegment[],
	pairs: readonly SegmentPair[],
	sequence: readonly number[],
	spacing: number,
	endCap: number,
	members: ReadonlySet<number>,
	positions: readonly number[],
): Map<number, number> | SegmentPair | undefined => {
	const placeOf = new Map(sequence.map((node, index) => [node, index]));
	const constraints: SeparationConstraint[] = [];
	const keptGapOf = ({ kind, gap, endGap }: SegmentPair): number => {
		if (kind === "conflict") {
			return endGap === undefined ? spacing : Math.min(endGap, endCap);
		}
		return endGap === undefined ? gap : Math.min(gap, endCap);
	};
	for (const pair of pairs) {
		const { first, second, kind } = pair;
		const firstPlace = placeOf.get(first) as number;
		const secondPlace = placeOf.get(second) as number;
		if (kind !== "conflict" && firstPlace > secondPlace) {
			return undefined;
		}
		constraints.push({
			left: Math.min(firstPlace, secondPlace),
			right: Math.max(firstPlace, secondPlace),
			gap: keptGapOf(pair),
		});
	}
	const variables = sequence.map((node): SeparationVariable => {
		const segment = segments[node];
		return members.has(node)
			? {
					desired: segment.position,
					isFixed: false,
					low: Math.min(segment.position, segment.lowest),
					high: Math.max(segment.position, segment.highest),
				}
			: {
					desired: positions[node],
					isFixed: true,
					low: positions[node],
					high: positions[node],
				};
	});
	// Constraint indices, which are the pairs' too.
	const ins: number[][] = sequence.map(() => []);
	const outs: number[][] = sequence.map(() => []);
	constraints.forEach(({ left, right }, index) => {
		ins[right].push(index);
		outs[left].push(index);
	});

	const greatest: number[] = new Array<number>(sequence.length);
	/** The constraint that held each place below its own greatest, when one did. */
	const heldBy: (number | undefined)[] = new Array<number | undefined>(
		sequence.length,
	);
	for (let place = sequence.length - 1; place >= 0; place -= 1) {
		let most = Infinity;
		let holder: number | undefined;
		for (const index of outs[place]) {
			const { right, gap } = constraints[index];
			if (greatest[right] - gap < most) {
				most = greatest[right] - gap;
				holder = index;
			}
		}
		const { desired, isFixed, high } = variables[place];
		const segment = segments[sequence[place]];
		const candidates = isAtLeast(most, desired) ? [desired] : [];
		if (!isFixed) {
			const highestWhole = floorCoordinate(Math.min(most, segment.highest));
			if (highestWhole >= segment.lowest) {
				candidates.push(highestWhole);
			}
		}
		if (candidates.length === 0) {
			for (
				let index = holder;
				index !== undefined;
				index = heldBy[constraints[index].right]
			) {
				if (pairs[index].kind === "conflict") {
					return pairs[index];
				}
			}
			throw new Error(
				"nudgeRoutes: a group that does not fit has no conflict in the way",
			);
		}
		greatest[place] = Math.max(...candidates);
		heldBy[place] = greatest[place] < high ? holder : undefined;
	}

	const solved = solveSeparation(variables, constraints);
	const placed: number[] = [];
	for (let place = 0; place < sequence.length; place += 1) {
		const { desired, isFixed } = variables[place];
		let least = -Infinity;
		for (const index of ins[place]) {
			const { left, gap } = constraints[index];
			least = Math.max(least, placed[left] + gap);
		}
		const keepsPosition =
			isAtLeast(desired, least) && isAtLeast(greatest[place], desired);
		if (
			isFixed ||
			(keepsPosition && isSameCoordinate(solved[place], desired))
		) {
			placed.push(desired);
			continue;
		}
		const segment = segments[sequence[place]];
		const low = Math.max(segment.lowest, ceilCoordinate(least));
		const high = Math.min(segment.highest, floorCoordinate(greatest[place]));
		placed.push(
			low <= high
				? Math.min(Math.max(Math.round(solved[place]), low), high)
				: desired,
		);
	}
	const moved = new Map<number, number>();
	sequence.forEach((node, place) => {
		if (
			!variables[place].isFixed &&
			placed[place] !== segments[node].position
		) {
			moved.set(node, placed[place]);
		}
	});
	return moved;
};

/** The current order's pair for a conflict: kept as the segments stand, no nearer. */
const toOrderPair = (
	segments: readonly RouteSegment[],
	{ first, second }: SegmentPair,
): SegmentPair => ({
	first,
	second,
	kind: "order",
	gap: Math.min(
		GAP_LANE_SPACING,
		segments[second].position - segments[first].position,
	),
	isSwapped: false,
	endGap: undefined,
});

/**
 * New positions for one group's members. The conflicts that keep the group from
 * fitting even at LEAST_LANE_SPACING, end pairs at it too, in the decided order or
 * the current one, are found one at a time where the current order fails (see
 * arrangeGroup) and kept as they stand instead (see toOrderPair), so they hold back no
 * other; the rest are set in the order decideOrder gives them, the other pairs in
 * their own, at the lane spacing or the widest whole px down to LEAST_LANE_SPACING
 * that fits, trying the current order at each spacing when the decided one does not
 * fit. At each spacing the end pairs squeeze first: the group takes the widest end
 * cap from the spacing's share of EDGE_END_SPACING down to LEAST_LANE_SPACING that
 * fits, and only a group that fits with none goes on to a narrower spacing. Empty
 * when nothing moves.
 *
 * @param members - See arrangeGroup
 * @param positions - See arrangeGroup
 */
const spreadGroup = (
	segments: readonly RouteSegment[],
	groupPairs: readonly SegmentPair[],
	members: ReadonlySet<number>,
	positions: readonly number[],
): Map<number, number> => {
	const nodes = [
		...new Set(groupPairs.flatMap(({ first, second }) => [first, second])),
	].sort((a, b) => a - b);
	const localIndex = new Map(nodes.map((node, index) => [node, index]));
	let pairs = groupPairs;
	/** The group's arrangement, or the conflict in the way in the current order. */
	const arrange = (
		spacing: number,
		endCap: number,
	): Map<number, number> | SegmentPair => {
		const decided = orderTopologically(
			nodes.length,
			pairs.map(({ first, second, isSwapped }) => {
				const edge = [
					localIndex.get(first) as number,
					localIndex.get(second) as number,
				] as const;
				return isSwapped ? ([edge[1], edge[0]] as const) : edge;
			}),
		).map((index) => nodes[index]);
		const inDecidedOrder = arrangeGroup(
			segments,
			pairs,
			decided,
			spacing,
			endCap,
			members,
			positions,
		);
		if (inDecidedOrder instanceof Map) {
			return inDecidedOrder;
		}
		// The current order reverses no pair, so it fits or names the conflict.
		return (
			decided.every((node, index) => node === nodes[index])
				? inDecidedOrder
				: arrangeGroup(
						segments,
						pairs,
						nodes,
						spacing,
						endCap,
						members,
						positions,
					)
		) as Map<number, number> | SegmentPair;
	};
	for (
		let atLeastSpacing = arrange(LEAST_LANE_SPACING, LEAST_LANE_SPACING);
		!(atLeastSpacing instanceof Map);
		atLeastSpacing = arrange(LEAST_LANE_SPACING, LEAST_LANE_SPACING)
	) {
		const blocking = atLeastSpacing;
		pairs = pairs.map((pair) =>
			pair === blocking ? toOrderPair(segments, pair) : pair,
		);
	}
	if (!pairs.some(({ kind }) => kind === "conflict")) {
		return new Map();
	}
	const hasEndPairs = pairs.some(({ endGap }) => endGap !== undefined);
	for (
		let spacing = GAP_LANE_SPACING;
		spacing >= LEAST_LANE_SPACING;
		spacing -= 1
	) {
		const atLeastEndCap = arrange(spacing, LEAST_LANE_SPACING);
		if (!(atLeastEndCap instanceof Map)) {
			continue;
		}
		if (!hasEndPairs) {
			return atLeastEndCap;
		}
		for (
			let endCap = Math.round((spacing * EDGE_END_SPACING) / GAP_LANE_SPACING);
			endCap > LEAST_LANE_SPACING;
			endCap -= 1
		) {
			const arrangement = arrange(spacing, endCap);
			if (arrangement instanceof Map) {
				return arrangement;
			}
		}
		return atLeastEndCap;
	}
	return new Map();
};

/**
 * Spread apart the segments running along one axis (vertical ones in x when
 * `isVertical`). The movable segments that conflicts and fold pairs link make a group; the
 * groups are spread one by one in the current order of their first segment, each
 * holding the facing pairs it shares with another group against where the groups
 * before it left that one, so the pair keeps its gap whichever moves.
 */
export const nudgeAlong = (pass: NudgePass): void => {
	const { routes, isVertical } = pass;
	const segments = collectSegments(pass);
	const pairs = listSegmentPairs(segments, pass);
	const parents = segments.map((_, index) => index);
	const findRoot = (index: number): number => {
		let root = index;
		while (parents[root] !== root) {
			root = parents[root];
		}
		for (let at = index; parents[at] !== root;) {
			const next = parents[at];
			parents[at] = root;
			at = next;
		}
		return root;
	};
	for (const { first, second, kind } of pairs) {
		if (
			kind !== "order" &&
			!isImmovable(segments[first]) &&
			!isImmovable(segments[second])
		) {
			parents[findRoot(second)] = findRoot(first);
		}
	}
	const groups = new Map<
		number,
		{ members: Set<number>; pairs: SegmentPair[] }
	>();
	segments.forEach((segment, index) => {
		if (isImmovable(segment)) {
			return;
		}
		const root = findRoot(index);
		const group = groups.get(root);
		if (group === undefined) {
			groups.set(root, { members: new Set([index]), pairs: [] });
		} else {
			group.members.add(index);
		}
	});
	for (const pair of pairs) {
		const roots = new Set(
			[pair.first, pair.second]
				.filter((node) => !isImmovable(segments[node]))
				.map(findRoot),
		);
		for (const root of roots) {
			(groups.get(root) as { pairs: SegmentPair[] }).pairs.push(pair);
		}
	}
	// Every group is judged on the routes as they stood; all move at once at the end.
	const positions = segments.map(({ position }) => position);
	const moves = new Map<number, number>();
	for (const { members, pairs: groupPairs } of groups.values()) {
		if (!groupPairs.some(({ kind }) => kind === "conflict")) {
			continue;
		}
		for (const [node, position] of spreadGroup(
			segments,
			groupPairs,
			members,
			positions,
		)) {
			positions[node] = position;
			moves.set(node, position);
		}
	}
	for (const [node, position] of moves) {
		for (const { routeIndex, segmentIndex } of listSegmentMembers(
			segments[node],
		)) {
			const { path } = routes[routeIndex];
			for (const point of [path[segmentIndex], path[segmentIndex + 1]]) {
				if (isVertical) {
					point.x = position;
				} else {
					point.y = position;
				}
			}
		}
	}
};
