import type { Point } from "@jiscribe/geometry";

import { calcPositionAlongPath } from "./calcPositionAlongPath";
import { type LayoutDirection, isVerticalFlow } from "./LayoutDirection";

/** Room a label needs beyond its own extent on the run it sits on, in px. */
const LABEL_RUN_MARGIN = 8;

/**
 * Where along a right-angled route its label goes: on the run that crosses the gap
 * dagre kept the label in, when the run is long enough to carry the label clear of
 * both corners, level with where dagre put it (dagre keeps the labels of one gap
 * apart sideways) and no nearer a corner than half the label; else at the spot on
 * the route nearest to where dagre put the label.
 *
 * @param path - The whole route, both ends included
 * @param labelPoint - Where dagre centred the label, in the same frame as `path`
 * @param labelExtent - The label box's size across the rank axis (its width in a
 *   top-to-bottom flow), which a sideways run has to exceed to hold it
 * @param direction - Decides which axis is the rank axis
 * @param rankSpacing - Width of a gap in px; a run further than this from the label
 *   lies in another gap and is not the label's
 * @returns 0 at the route's start, 1 at its end
 */
export const calcLabelPosition = (
	path: readonly Point[],
	labelPoint: Point,
	labelExtent: number,
	direction: LayoutDirection,
	rankSpacing: number,
): number => {
	const vertical = isVerticalFlow(direction);
	const along = (point: Point): number => (vertical ? point.y : point.x);
	const across = (point: Point): number => (vertical ? point.x : point.y);
	let bestIndex = -1;
	let bestDistance = rankSpacing;
	for (let index = 0; index + 1 < path.length; index += 1) {
		const start = path[index];
		const end = path[index + 1];
		const isSidewaysRun =
			along(start) === along(end) && across(start) !== across(end);
		const distance = Math.abs(along(start) - along(labelPoint));
		if (isSidewaysRun && distance < bestDistance) {
			bestIndex = index;
			bestDistance = distance;
		}
	}
	if (bestIndex >= 0) {
		const start = path[bestIndex];
		const end = path[bestIndex + 1];
		if (
			Math.abs(across(end) - across(start)) >=
			labelExtent + LABEL_RUN_MARGIN
		) {
			const lower = Math.min(across(start), across(end)) + labelExtent / 2;
			const upper = Math.max(across(start), across(end)) - labelExtent / 2;
			const acrossValue = Math.min(upper, Math.max(lower, across(labelPoint)));
			return calcPositionAlongPath(
				path,
				vertical
					? { x: acrossValue, y: along(start) }
					: { x: along(start), y: acrossValue },
			);
		}
	}
	return calcPositionAlongPath(path, labelPoint);
};
