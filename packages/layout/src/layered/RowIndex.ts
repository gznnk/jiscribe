import type { Point } from "@jiscribe/geometry";

import type { LayoutAxis } from "../shared/LayoutAxis";
import type { LaidOutContainer, LaidOutNode } from "../shared/types";

/**
 * A rank coordinate as a lookup key: rows and gaps that are the same to the routing
 * share one, their coordinates coming out of one subtraction each and so agreeing to
 * well under a thousandth of a pixel.
 */
export const toRowKey = (along: number): number => Math.round(along * 1000);

/**
 * The rows of a layout along the rank axis, which the routing has to tell apart from
 * the gaps between them: dagre's interior points sit either in the middle of a gap or
 * in the slot a dummy node holds on a row.
 */
export type RowIndex = {
	/** Whether the coordinate is a row nodes sit on (every node of a rank shares one). */
	isSlotRow: (along: number) => boolean;
	/** Whether the coordinate is the border rank dagre adds along a container's edge. */
	isBorderRow: (along: number) => boolean;
};

export const createRowIndex = (
	nodes: readonly LaidOutNode[],
	containers: readonly LaidOutContainer[],
	axis: LayoutAxis,
): RowIndex => {
	const slotRows = new Set(
		nodes.map(({ bounds }) =>
			toRowKey(axis.alongStart(bounds) + axis.alongExtent(bounds) / 2),
		),
	);
	const borderRows = new Set(
		containers.flatMap(({ bounds }) => [
			toRowKey(axis.alongStart(bounds)),
			toRowKey(axis.alongStart(bounds) + axis.alongExtent(bounds)),
		]),
	);
	return {
		isSlotRow: (along) => slotRows.has(toRowKey(along)),
		isBorderRow: (along) => borderRows.has(toRowKey(along)),
	};
};

/**
 * The route dagre gave with the points on container borders dropped. The border ranks
 * hold nothing a route could hit, and the half gaps beside them are too narrow to bend
 * in, so a route crosses a border wherever its column is and bends in the gaps between
 * rows.
 *
 * @param points - Dagre's polyline, border to border; its two ends are always kept
 */
export const dropBorderPoints = (
	points: readonly Point[],
	rows: RowIndex,
	axis: LayoutAxis,
): Point[] =>
	points.filter(
		(point, index) =>
			index === 0 ||
			index === points.length - 1 ||
			!rows.isBorderRow(axis.along(point)),
	);

/**
 * The columns (coordinates across the rank axis) an edge travels in between its ends:
 * the dummy slots dagre routed it through, read off its interior points.
 */
export const readSlotColumns = (
	points: readonly Point[],
	rows: RowIndex,
	axis: LayoutAxis,
): number[] =>
	points
		.slice(1, -1)
		.filter((point) => rows.isSlotRow(axis.along(point)))
		.map((point) => axis.across(point));
