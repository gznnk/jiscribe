import type { Point, Rect } from "@jiscribe/geometry";

import type { LayoutAxis } from "./LayoutAxis";
import { type RowIndex, readSlotColumns } from "./RowIndex";
import { spreadSideEnds } from "./spreadSideEnds";
import type { LayoutEdgeAnchor, LayoutGraphEdge, LayoutSide } from "./types";

/**
 * How far along a side an anchor may sit when it puts the edge straight on the column
 * it travels in, so a short jog in the gap is traded for a line near the corner.
 */
export const EDGE_ANCHOR_STRAIGHT_RANGE = { min: 0.05, max: 0.95 } as const;

/** How far along a side the anchors of several edges sharing it may spread. */
export const EDGE_ANCHOR_FAN_RANGE = { min: 0.2, max: 0.8 } as const;

/** Least distance in px between two edge ends on one side: room for two arrowheads. */
export const EDGE_END_SPACING = 20;

/** Least distance in px between two edges joining the same pair of boxes. */
export const EDGE_BUNDLE_SPACING = EDGE_END_SPACING;

/** Share of the shorter side a bundle of parallel edges may spread over. */
const BUNDLE_SIDE_SHARE = 0.8;

/** How far along the lines the labels of a bundle are staggered from each other. */
const BUNDLE_LABEL_STAGGER = 0.15;

/** Where along a line a bundle's label may sit, so the stagger keeps clear of the ends. */
const BUNDLE_LABEL_RANGE = { min: 0.2, max: 0.8 } as const;

type Range = { readonly min: number; readonly max: number };

const clampRatio = (ratio: number, range: Range): number =>
	Math.min(range.max, Math.max(range.min, ratio));

const isWithin = (ratio: number, range: Range): boolean =>
	ratio >= range.min && ratio <= range.max;

/** An edge as this stage takes it: dagre's route between the two boxes it joins. */
export type EdgeToAnchor = {
	edge: LayoutGraphEdge;
	sourceBounds: Rect;
	targetBounds: Rect;
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
const calcFacingSides = (
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

/** A side of one box, as the key the anchor rules count edges on. */
const sideKey = (nodeId: string, side: LayoutSide): string =>
	`${nodeId}:${side}`;

/** Where `column` (a coordinate across the rank axis) falls along the box's side, 0..1. */
const calcSideRatio = (
	bounds: Rect,
	column: number,
	axis: LayoutAxis,
): number => (column - axis.acrossStart(bounds)) / axis.acrossExtent(bounds);

/**
 * An end's anchor, with where along the side the edge is headed (the unclamped ratio
 * of the column it travels in next), which orders the ends sharing a side.
 */
type EndAnchor = { anchor: LayoutEdgeAnchor; heading: number };

/**
 * The anchor for one end of an edge, given the column the edge travels in beyond
 * that end. On the column itself when the column crosses the side, so the edge
 * leaves straight; else at the side's midpoint when this is the side's only edge,
 * since a jog in the gap is then unavoidable and a centred one reads best; else
 * leaning toward the column, so the edges sharing the side fan out.
 */
const calcEndAnchor = (
	bounds: Rect,
	side: LayoutSide,
	column: number,
	isOnlyEdgeOnSide: boolean,
	axis: LayoutAxis,
): EndAnchor => {
	const ratio = calcSideRatio(bounds, column, axis);
	if (isWithin(ratio, EDGE_ANCHOR_STRAIGHT_RANGE)) {
		return { anchor: { side, t: ratio }, heading: ratio };
	}
	if (isOnlyEdgeOnSide) {
		return { anchor: { side, t: 0.5 }, heading: ratio };
	}
	return {
		anchor: { side, t: clampRatio(ratio, EDGE_ANCHOR_FAN_RANGE) },
		heading: ratio,
	};
};

type WorkingEdge = EdgeToAnchor & {
	sourceSide: LayoutSide;
	targetSide: LayoutSide;
	source: LayoutEdgeAnchor;
	target: LayoutEdgeAnchor;
	sourceHeading: number;
	targetHeading: number;
	/** True for an edge between neighbouring ranks, which travels in no slot column. */
	isAdjacent: boolean;
	labelPosition?: number;
};

/**
 * Both ends of every edge, by the facing sides and the column the edge travels in
 * next to each end (see calcEndAnchor); two boxes in neighbouring ranks share one
 * column when either centre crosses the other's unshared side.
 */
const anchorEnds = (
	edges: readonly EdgeToAnchor[],
	rows: RowIndex,
	axis: LayoutAxis,
): WorkingEdge[] => {
	const sided = edges.map((edge) => ({
		...edge,
		...calcFacingSides(edge.sourceBounds, edge.targetBounds, axis),
	}));
	// How many edges meet each side, which decides whether an end may sit at its midpoint.
	const edgeCountBySide = new Map<string, number>();
	for (const { edge, sourceSide, targetSide } of sided) {
		for (const key of [
			sideKey(edge.sourceId, sourceSide),
			sideKey(edge.targetId, targetSide),
		]) {
			edgeCountBySide.set(key, (edgeCountBySide.get(key) ?? 0) + 1);
		}
	}
	const isOnlyEdgeOnSide = (nodeId: string, side: LayoutSide): boolean =>
		edgeCountBySide.get(sideKey(nodeId, side)) === 1;

	return sided.map((working) => {
		const { edge, sourceBounds, targetBounds, sourceSide, targetSide } =
			working;
		const slotColumns = readSlotColumns(working.points, rows, axis);
		const sourceAlone = isOnlyEdgeOnSide(edge.sourceId, sourceSide);
		const targetAlone = isOnlyEdgeOnSide(edge.targetId, targetSide);
		let source: EndAnchor;
		let target: EndAnchor;
		if (slotColumns.length === 0) {
			const targetCentreRatio = calcSideRatio(
				sourceBounds,
				axis.acrossCentre(targetBounds),
				axis,
			);
			const sourceCentreRatio = calcSideRatio(
				targetBounds,
				axis.acrossCentre(sourceBounds),
				axis,
			);
			if (
				targetAlone &&
				isWithin(targetCentreRatio, EDGE_ANCHOR_STRAIGHT_RANGE)
			) {
				source = {
					anchor: { side: sourceSide, t: targetCentreRatio },
					heading: targetCentreRatio,
				};
				target = {
					anchor: { side: targetSide, t: 0.5 },
					heading: sourceCentreRatio,
				};
			} else if (
				sourceAlone &&
				isWithin(sourceCentreRatio, EDGE_ANCHOR_STRAIGHT_RANGE)
			) {
				source = {
					anchor: { side: sourceSide, t: 0.5 },
					heading: targetCentreRatio,
				};
				target = {
					anchor: { side: targetSide, t: sourceCentreRatio },
					heading: sourceCentreRatio,
				};
			} else {
				source = calcEndAnchor(
					sourceBounds,
					sourceSide,
					axis.acrossCentre(targetBounds),
					sourceAlone,
					axis,
				);
				target = calcEndAnchor(
					targetBounds,
					targetSide,
					axis.acrossCentre(sourceBounds),
					targetAlone,
					axis,
				);
			}
		} else {
			// Each end meets the slot column the edge travels in next to it.
			source = calcEndAnchor(
				sourceBounds,
				sourceSide,
				slotColumns[0],
				sourceAlone,
				axis,
			);
			target = calcEndAnchor(
				targetBounds,
				targetSide,
				slotColumns[slotColumns.length - 1],
				targetAlone,
				axis,
			);
		}
		return {
			...working,
			source: source.anchor,
			target: target.anchor,
			sourceHeading: source.heading,
			targetHeading: target.heading,
			isAdjacent: slotColumns.length === 0,
		};
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
		const key = [working.edge.sourceId, working.edge.targetId]
			.sort()
			.join("\u0000");
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
			): LayoutEdgeAnchor => ({
				side: anchor.side,
				t: clampRatio(anchor.t + shift / axis.acrossExtent(bounds), {
					min: 0,
					max: 1,
				}),
			});
			working.source = shiftAnchor(working.source, working.sourceBounds);
			working.target = shiftAnchor(working.target, working.targetBounds);
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
			const key = sideKey(nodeId, working[end].side);
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
		const bounds =
			refs[0].end === "source"
				? refs[0].working.sourceBounds
				: refs[0].working.targetBounds;
		const spread = spreadSideEnds(
			refs.map(({ working, end }) => ({
				t: working[end].t,
				heading:
					end === "source" ? working.sourceHeading : working.targetHeading,
			})),
			axis.acrossExtent(bounds),
			EDGE_END_SPACING,
		);
		refs.forEach(({ working, end }, index) => {
			working[end] = { side: working[end].side, t: spread[index] };
		});
	}
};

/**
 * Where every edge meets its two boxes: on the sides facing each other along the rank
 * axis, straight on the column the edge travels in when that crosses the side, at the
 * midpoint for a side's only edge, fanned out for several; edges joining one pair of
 * boxes run side by side, and ends that would touch are opened to arrowhead width in
 * the order their edges are headed.
 *
 * @param edges - Dagre's routes, container borders dropped, with the boxes they join
 * @param rows - Tells a slot column from a gap on a route
 * @param axis - The rank axis, which also names the facing sides
 * @returns One entry per edge, in the order given
 */
export const chooseEdgeAnchors = (
	edges: readonly EdgeToAnchor[],
	rows: RowIndex,
	axis: LayoutAxis,
): AnchoredEdge[] => {
	const working = anchorEnds(edges, rows, axis);
	spreadBundles(working, axis);
	spreadEndsOnSides(working, axis);
	return working.map(({ source, target, labelPosition }) => ({
		source,
		target,
		...(labelPosition !== undefined ? { labelPosition } : {}),
	}));
};
