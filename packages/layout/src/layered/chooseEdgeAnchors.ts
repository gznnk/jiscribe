import type { Point, Rect } from "@jiscribe/geometry";

import { type RowIndex, readSlotColumns } from "./RowIndex";
import { spreadSideEnds } from "./spreadSideEnds";
import type { LayoutGraphEdge, LayoutGraphNode } from "./types";
import {
	calcCentredAnchorRatio,
	intersectAnchorRanges,
	readAnchorRange,
	scaleIntoAnchorRange,
	scaleIntoBodyWithinUsable,
} from "../shared/anchorRange";
import { EDGE_ANCHOR_FAN_RANGE, EDGE_END_SPACING } from "../shared/edgeSpacing";
import type { LayoutAxis } from "../shared/LayoutAxis";
import { toSideKey } from "../shared/layoutSides";
import {
	EDGE_ANCHOR_STRAIGHT_RANGE,
	calcSideRatio,
	calcStraightAnchorRatio,
	columnAt,
	isStraightRatio,
} from "../shared/straightAnchor";
import type {
	LayoutAnchorRange,
	LayoutEdgeAnchor,
	LayoutSide,
} from "../shared/types";

/** Least distance in px between two edges joining the same pair of boxes. */
export const EDGE_BUNDLE_SPACING = EDGE_END_SPACING;

/** Share of the shorter side a bundle of parallel edges may spread over. */
const BUNDLE_SIDE_SHARE = 0.8;

/** How far along the lines the labels of a bundle are staggered from each other. */
const BUNDLE_LABEL_STAGGER = 0.15;

/**
 * Where along a line a bundle's label may sit, so the stagger keeps clear of the ends;
 * measured on the line less the stretch an end runs through its own node's visual
 * margin, which computeLayeredLayout maps back onto the whole line.
 */
const BUNDLE_LABEL_RANGE = { min: 0.2, max: 0.8 } as const;

type Range = Readonly<LayoutAnchorRange>;

const clampRatio = (ratio: number, range: Range): number =>
	Math.min(range.max, Math.max(range.min, ratio));

/** An edge as this stage takes it: dagre's route between the two boxes it joins. */
export type EdgeToAnchor = {
	edge: LayoutGraphEdge;
	sourceBounds: Rect;
	targetBounds: Rect;
	/** The source node's usable stretch of each side; see {@link LayoutGraphNode.anchorRanges}. */
	sourceAnchorRanges?: LayoutGraphNode["anchorRanges"];
	/** The target node's, likewise. */
	targetAnchorRanges?: LayoutGraphNode["anchorRanges"];
	/** The source node's body on each side; see {@link LayoutGraphNode.anchorBodyRanges}. */
	sourceAnchorBodyRanges?: LayoutGraphNode["anchorBodyRanges"];
	/** The target node's, likewise. */
	targetAnchorBodyRanges?: LayoutGraphNode["anchorBodyRanges"];
	/** Dagre's route, container borders already dropped. */
	points: readonly Point[];
};

/** Where an edge meets its two boxes, and where its label goes when a bundle decides that. */
export type AnchoredEdge = {
	source: LayoutEdgeAnchor;
	target: LayoutEdgeAnchor;
	/**
	 * A position along the edge for its label, set for the labelled edges of a bundle
	 * so their labels do not stack; absent, the label is placed from the route.
	 */
	labelPosition?: number;
};

/** Which sides face each other along the rank axis, read off the two boxes' centres. */
const calcRankFacingSides = (
	source: Rect,
	target: Rect,
	axis: LayoutAxis,
): { sourceSide: LayoutSide; targetSide: LayoutSide } => {
	const delta =
		axis.alongStart(target) +
		axis.alongExtent(target) / 2 -
		(axis.alongStart(source) + axis.alongExtent(source) / 2);
	return delta >= 0
		? { sourceSide: axis.aheadSide, targetSide: axis.behindSide }
		: { sourceSide: axis.behindSide, targetSide: axis.aheadSide };
};

/**
 * The anchor for one end of an edge, given where along the side the edge is headed
 * (the unclamped ratio of the column it travels in beyond that end), the side's body
 * and its usable stretch. On the column itself when the column crosses the usable
 * stretch, so the edge leaves straight; else at the body's middle when this is the
 * side's only edge, since a jog in the gap is then unavoidable and a centred one reads
 * best, or at the usable stretch's middle when the body's is off the outline; else
 * leaning toward the column within {@link EDGE_ANCHOR_FAN_RANGE}, so the edges sharing
 * the side fan out.
 */
const calcEndAnchor = (
	side: LayoutSide,
	heading: number,
	isOnlyEdgeOnSide: boolean,
	body: Range,
	usable: Range,
): LayoutEdgeAnchor => {
	if (isStraightRatio(heading, usable)) {
		return { side, t: heading };
	}
	if (isOnlyEdgeOnSide) {
		return { side, t: calcCentredAnchorRatio(body, usable) };
	}
	return {
		side,
		t: clampRatio(
			heading,
			scaleIntoBodyWithinUsable(body, usable, EDGE_ANCHOR_FAN_RANGE),
		),
	};
};

/** The key that groups the edges joining one pair of boxes, whichever way they run. */
const bundleKey = (edge: LayoutGraphEdge): string =>
	[edge.sourceId, edge.targetId].sort().join("\u0000");

/** An edge with its facing sides and where along each the edge is headed. */
type HeadedEdge = EdgeToAnchor & {
	sourceSide: LayoutSide;
	targetSide: LayoutSide;
	/** Where along the source side the edge is headed, unclamped (see SideEnd). */
	sourceHeading: number;
	/** Where along the target side the edge is headed, unclamped (see SideEnd). */
	targetHeading: number;
	/** True for an edge between neighbouring ranks, which travels in no slot column. */
	isAdjacent: boolean;
	/** True when the source end is the only edge end on its side. */
	sourceAlone: boolean;
	/** True when the target end is the only edge end on its side. */
	targetAlone: boolean;
	/** The source side's usable stretch (see LayoutGraphNode.anchorRanges). */
	sourceUsable: Range;
	/** The target side's usable stretch. */
	targetUsable: Range;
	/** The source side's body (see LayoutGraphNode.anchorBodyRanges). */
	sourceBody: Range;
	/** The target side's body. */
	targetBody: Range;
};

type WorkingEdge = HeadedEdge & {
	source: LayoutEdgeAnchor;
	target: LayoutEdgeAnchor;
	labelPosition?: number;
};

/**
 * Every edge's facing sides and headings: toward the other box's centre for an edge
 * between neighbouring ranks, else toward the slot column next to each end.
 */
const headEnds = (
	edges: readonly EdgeToAnchor[],
	rows: RowIndex,
	axis: LayoutAxis,
): HeadedEdge[] => {
	const sided = edges.map((edge) => ({
		...edge,
		...calcRankFacingSides(edge.sourceBounds, edge.targetBounds, axis),
	}));
	// How many edges meet each side, which decides whether an end may sit at its midpoint.
	const edgeCountBySide = new Map<string, number>();
	for (const { edge, sourceSide, targetSide } of sided) {
		for (const key of [
			toSideKey(edge.sourceId, sourceSide),
			toSideKey(edge.targetId, targetSide),
		]) {
			edgeCountBySide.set(key, (edgeCountBySide.get(key) ?? 0) + 1);
		}
	}
	const isOnlyEdgeOnSide = (nodeId: string, side: LayoutSide): boolean =>
		edgeCountBySide.get(toSideKey(nodeId, side)) === 1;

	return sided.map((working) => {
		const { edge, sourceBounds, targetBounds, sourceSide, targetSide } =
			working;
		const slotColumns = readSlotColumns(working.points, rows, axis);
		const isAdjacent = slotColumns.length === 0;
		return {
			...working,
			sourceHeading: calcSideRatio(
				sourceBounds,
				isAdjacent ? axis.acrossCentre(targetBounds) : slotColumns[0],
				axis,
			),
			targetHeading: calcSideRatio(
				targetBounds,
				isAdjacent
					? axis.acrossCentre(sourceBounds)
					: slotColumns[slotColumns.length - 1],
				axis,
			),
			isAdjacent,
			sourceAlone: isOnlyEdgeOnSide(edge.sourceId, sourceSide),
			targetAlone: isOnlyEdgeOnSide(edge.targetId, targetSide),
			sourceUsable: readAnchorRange(working.sourceAnchorRanges, sourceSide),
			targetUsable: readAnchorRange(working.targetAnchorRanges, targetSide),
			sourceBody: readAnchorRange(working.sourceAnchorBodyRanges, sourceSide),
			targetBody: readAnchorRange(working.targetAnchorBodyRanges, targetSide),
		};
	});
};

/**
 * Both ends of an edge by the column it travels in next to each end (see
 * calcEndAnchor); two boxes in neighbouring ranks share one column when a side's only
 * end, where calcEndAnchor centres it, faces a column the other side can meet
 * straight.
 */
const anchorEnd = (headed: HeadedEdge, axis: LayoutAxis): WorkingEdge => {
	const {
		sourceBounds,
		targetBounds,
		sourceSide,
		targetSide,
		sourceHeading,
		targetHeading,
		sourceAlone,
		targetAlone,
		sourceUsable,
		targetUsable,
		sourceBody,
		targetBody,
	} = headed;
	if (headed.isAdjacent) {
		if (targetAlone) {
			const targetCentre = calcCentredAnchorRatio(targetBody, targetUsable);
			const towardTargetCentre = calcStraightAnchorRatio(
				sourceBounds,
				columnAt(targetBounds, targetCentre, axis),
				sourceUsable,
				axis,
			);
			if (towardTargetCentre !== undefined) {
				return {
					...headed,
					source: { side: sourceSide, t: towardTargetCentre },
					target: { side: targetSide, t: targetCentre },
				};
			}
		}
		if (sourceAlone) {
			const sourceCentre = calcCentredAnchorRatio(sourceBody, sourceUsable);
			const towardSourceCentre = calcStraightAnchorRatio(
				targetBounds,
				columnAt(sourceBounds, sourceCentre, axis),
				targetUsable,
				axis,
			);
			if (towardSourceCentre !== undefined) {
				return {
					...headed,
					source: { side: sourceSide, t: sourceCentre },
					target: { side: targetSide, t: towardSourceCentre },
				};
			}
		}
	}
	return {
		...headed,
		source: calcEndAnchor(
			sourceSide,
			sourceHeading,
			sourceAlone,
			sourceBody,
			sourceUsable,
		),
		target: calcEndAnchor(
			targetSide,
			targetHeading,
			targetAlone,
			targetBody,
			targetUsable,
		),
	};
};

/**
 * Puts on one straight column each edge between neighbouring ranks whose sides are
 * both shared and which no other edge bundles with: the mean of where the end's rank
 * by heading puts it on each side's body, kept where both sides' usable stretches can
 * meet it straight. An edge
 * keeps its ends when no such column exists or spreading either side's ends would move
 * its end, or the end of an edge already put on a column, off it. Edges are decided in
 * order, each against the ends as already decided. Mutates the edges.
 */
const straightenSharedEdges = (
	edges: readonly WorkingEdge[],
	axis: LayoutAxis,
): void => {
	type SideEndRef = { edgeIndex: number; end: "source" | "target" };
	const endsBySide = new Map<string, SideEndRef[]>();
	const bundleSizes = new Map<string, number>();
	edges.forEach((working, edgeIndex) => {
		for (const end of ["source", "target"] as const) {
			const nodeId =
				end === "source" ? working.edge.sourceId : working.edge.targetId;
			const key = toSideKey(nodeId, working[end].side);
			const ends = endsBySide.get(key);
			if (ends === undefined) {
				endsBySide.set(key, [{ edgeIndex, end }]);
			} else {
				ends.push({ edgeIndex, end });
			}
		}
		if (working.isAdjacent) {
			const key = bundleKey(working.edge);
			bundleSizes.set(key, (bundleSizes.get(key) ?? 0) + 1);
		}
	});
	const headingOf = ({ edgeIndex, end }: SideEndRef): number =>
		end === "source"
			? edges[edgeIndex].sourceHeading
			: edges[edgeIndex].targetHeading;
	for (const ends of endsBySide.values()) {
		ends.sort(
			(a, b) => headingOf(a) - headingOf(b) || a.edgeIndex - b.edgeIndex,
		);
	}

	/** The end's side ordered by heading, and the end's place in it. */
	const locateEnd = (
		working: WorkingEdge,
		edgeIndex: number,
		end: "source" | "target",
	): { ends: readonly SideEndRef[]; rank: number } => {
		const nodeId =
			end === "source" ? working.edge.sourceId : working.edge.targetId;
		const ends = endsBySide.get(toSideKey(nodeId, working[end].side)) ?? [];
		return {
			ends,
			rank: ends.findIndex(
				(ref) => ref.edgeIndex === edgeIndex && ref.end === end,
			),
		};
	};
	/**
	 * Where an end ranked among a side's ends would sit on it with all of them evenly
	 * spaced over the side's body (see LayoutGraphNode.anchorBodyRanges).
	 */
	const idealRatioOf = (
		{
			ends,
			rank,
		}: {
			ends: readonly SideEndRef[];
			rank: number;
		},
		body: Range,
	): number => {
		const share = (rank + 1) / (ends.length + 1);
		return scaleIntoAnchorRange(body, { min: share, max: share }).min;
	};
	/** Indices of the edges already put on a column. */
	const straightened = new Set<number>();
	/**
	 * Whether the end at `t`, and every end on its side already put on a column, would
	 * stay where it is when the side's ends are spread (see spreadSideEnds), the others
	 * where they stand now.
	 */
	const holdsWhenSpread = (
		ends: readonly SideEndRef[],
		rank: number,
		t: number,
		extent: number,
		usable: Range,
	): boolean => {
		const positions = ends.map((ref, index) =>
			index === rank ? t : edges[ref.edgeIndex][ref.end].t,
		);
		const spread = spreadSideEnds(
			ends.map((ref, index) => ({
				t: positions[index],
				heading: headingOf(ref),
			})),
			extent,
			EDGE_END_SPACING,
			usable,
		);
		return ends.every(
			(ref, index) =>
				(index !== rank && !straightened.has(ref.edgeIndex)) ||
				spread[index] === positions[index],
		);
	};

	edges.forEach((working, edgeIndex) => {
		if (
			!working.isAdjacent ||
			working.sourceAlone ||
			working.targetAlone ||
			(bundleSizes.get(bundleKey(working.edge)) ?? 0) > 1
		) {
			return;
		}
		const {
			sourceBounds,
			targetBounds,
			sourceUsable,
			targetUsable,
			sourceBody,
			targetBody,
		} = working;
		const sourceStraight = intersectAnchorRanges(
			EDGE_ANCHOR_STRAIGHT_RANGE,
			sourceUsable,
		);
		const targetStraight = intersectAnchorRanges(
			EDGE_ANCHOR_STRAIGHT_RANGE,
			targetUsable,
		);
		const shared = {
			min: Math.max(
				columnAt(sourceBounds, sourceStraight.min, axis),
				columnAt(targetBounds, targetStraight.min, axis),
			),
			max: Math.min(
				columnAt(sourceBounds, sourceStraight.max, axis),
				columnAt(targetBounds, targetStraight.max, axis),
			),
		};
		if (shared.min > shared.max) {
			return;
		}
		const sourcePlace = locateEnd(working, edgeIndex, "source");
		const targetPlace = locateEnd(working, edgeIndex, "target");
		const column = clampRatio(
			(columnAt(sourceBounds, idealRatioOf(sourcePlace, sourceBody), axis) +
				columnAt(targetBounds, idealRatioOf(targetPlace, targetBody), axis)) /
				2,
			shared,
		);
		const sourceT = calcSideRatio(sourceBounds, column, axis);
		const targetT = calcSideRatio(targetBounds, column, axis);
		if (
			holdsWhenSpread(
				sourcePlace.ends,
				sourcePlace.rank,
				sourceT,
				axis.acrossExtent(sourceBounds),
				sourceUsable,
			) &&
			holdsWhenSpread(
				targetPlace.ends,
				targetPlace.rank,
				targetT,
				axis.acrossExtent(targetBounds),
				targetUsable,
			)
		) {
			working.source = { side: working.source.side, t: sourceT };
			working.target = { side: working.target.side, t: targetT };
			straightened.add(edgeIndex);
		}
	});
};

/**
 * Edges joining the same two boxes in neighbouring ranks would land on one column;
 * slide each sideways by a share of the bundle's width, labels included, so they run
 * side by side, and stagger their labels along the lines. Mutates the edges.
 */
const spreadBundles = (
	edges: readonly WorkingEdge[],
	axis: LayoutAxis,
): void => {
	const bundles = new Map<string, WorkingEdge[]>();
	for (const working of edges) {
		if (!working.isAdjacent) {
			continue;
		}
		const key = bundleKey(working.edge);
		const bundle = bundles.get(key);
		if (bundle === undefined) {
			bundles.set(key, [working]);
		} else {
			bundle.push(working);
		}
	}
	const labelExtentOf = (edge: LayoutGraphEdge): number =>
		edge.label === undefined ? 0 : axis.acrossSize(edge.label);
	for (const bundle of bundles.values()) {
		if (bundle.length < 2) {
			continue;
		}
		const offsets: number[] = [0];
		for (let index = 1; index < bundle.length; index += 1) {
			offsets.push(
				offsets[index - 1] +
					Math.max(
						EDGE_BUNDLE_SPACING,
						(labelExtentOf(bundle[index - 1].edge) +
							labelExtentOf(bundle[index].edge)) /
							2 +
							EDGE_BUNDLE_SPACING / 2,
					),
			);
		}
		// The stack has to fit the shorter of the two sides, with a margin at each end.
		const usable =
			BUNDLE_SIDE_SHARE *
			Math.min(
				axis.acrossExtent(bundle[0].sourceBounds),
				axis.acrossExtent(bundle[0].targetBounds),
			);
		const span = offsets[offsets.length - 1];
		const scale = span > usable ? usable / span : 1;
		const centre = span / 2;
		const labelled = bundle.filter(({ edge }) => edge.label !== undefined);
		bundle.forEach((working, index) => {
			const shift = (offsets[index] - centre) * scale;
			if (labelled.length > 1 && working.edge.label !== undefined) {
				const rank = labelled.indexOf(working);
				const position = clampRatio(
					0.5 + (rank - (labelled.length - 1) / 2) * BUNDLE_LABEL_STAGGER,
					BUNDLE_LABEL_RANGE,
				);
				// A position is measured from the edge's own source, so an edge running
				// the other way takes the mirror image to land beside the others.
				working.labelPosition =
					working.edge.sourceId === bundle[0].edge.sourceId
						? position
						: 1 - position;
			}
			const shiftAnchor = (
				anchor: LayoutEdgeAnchor,
				bounds: Rect,
				anchorRanges: LayoutGraphNode["anchorRanges"],
			): LayoutEdgeAnchor => {
				const extent = axis.acrossExtent(bounds);
				// A side with no extent has nowhere to shift an end to.
				return {
					side: anchor.side,
					t: clampRatio(
						extent === 0 ? anchor.t : anchor.t + shift / extent,
						readAnchorRange(anchorRanges, anchor.side),
					),
				};
			};
			working.source = shiftAnchor(
				working.source,
				working.sourceBounds,
				working.sourceAnchorRanges,
			);
			working.target = shiftAnchor(
				working.target,
				working.targetBounds,
				working.targetAnchorRanges,
			);
		});
	}
};

/**
 * Ends that landed within {@link EDGE_END_SPACING} of each other on one side are
 * pushed apart, in the order of where their edges are headed (see spreadSideEnds).
 * Mutates the edges.
 */
const spreadEndsOnSides = (
	edges: readonly WorkingEdge[],
	axis: LayoutAxis,
): void => {
	type SideEndRef = { working: WorkingEdge; end: "source" | "target" };
	const endsBySide = new Map<string, SideEndRef[]>();
	for (const working of edges) {
		for (const end of ["source", "target"] as const) {
			const nodeId =
				end === "source" ? working.edge.sourceId : working.edge.targetId;
			const key = toSideKey(nodeId, working[end].side);
			const ends = endsBySide.get(key);
			if (ends === undefined) {
				endsBySide.set(key, [{ working, end }]);
			} else {
				ends.push({ working, end });
			}
		}
	}
	for (const refs of endsBySide.values()) {
		if (refs.length < 2) {
			continue;
		}
		const [first] = refs;
		const bounds =
			first.end === "source"
				? first.working.sourceBounds
				: first.working.targetBounds;
		const anchorRanges =
			first.end === "source"
				? first.working.sourceAnchorRanges
				: first.working.targetAnchorRanges;
		const spread = spreadSideEnds(
			refs.map(({ working, end }) => ({
				t: working[end].t,
				heading:
					end === "source" ? working.sourceHeading : working.targetHeading,
			})),
			axis.acrossExtent(bounds),
			EDGE_END_SPACING,
			readAnchorRange(anchorRanges, first.working[first.end].side),
		);
		refs.forEach(({ working, end }, index) => {
			working[end] = { side: working[end].side, t: spread[index] };
		});
	}
};

/**
 * Where every edge meets its two boxes: on the sides facing each other along the rank
 * axis, straight on the column the edge travels in when that crosses the side, at the
 * midpoint for a side's only edge, fanned out for several; an edge between neighbouring
 * ranks whose two sides are both shared runs on one straight column when one fits clear
 * of its neighbours; edges joining one pair of boxes run side by side, and ends that
 * would touch are opened to arrowhead width in the order their edges are headed. The
 * midpoint and the fan are measured on the side's body
 * (`LayoutGraphNode.anchorBodyRanges`); the side's usable stretch
 * (`LayoutGraphNode.anchorRanges`) only brings back an end that would fall outside
 * it, so no end leaves it.
 *
 * @param edges - Dagre's routes, container borders dropped, with the boxes they join
 *   and the bodies and usable stretches of their sides
 * @param rows - Tells a slot column from a gap on a route
 * @param axis - The rank axis, which also names the facing sides
 * @returns One entry per edge, in the order given
 */
export const chooseEdgeAnchors = (
	edges: readonly EdgeToAnchor[],
	rows: RowIndex,
	axis: LayoutAxis,
): AnchoredEdge[] => {
	const working = headEnds(edges, rows, axis).map((headed) =>
		anchorEnd(headed, axis),
	);
	straightenSharedEdges(working, axis);
	spreadBundles(working, axis);
	spreadEndsOnSides(working, axis);
	return working.map(({ source, target, labelPosition }) => ({
		source,
		target,
		...(labelPosition !== undefined ? { labelPosition } : {}),
	}));
};
