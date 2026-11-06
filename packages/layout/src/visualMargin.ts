import type { Rect } from "@jiscribe/geometry";

import type { LayoutGraphNode, LayoutSide, LayoutVisualMargin } from "./types";

const LAYOUT_SIDES: readonly LayoutSide[] = ["top", "right", "bottom", "left"];

/** How far the margin reaches past one side of the box, in px; 0 for a side left out. */
export const readVisualMargin = (
	margin: LayoutVisualMargin | undefined,
	side: LayoutSide,
): number => margin?.[side] ?? 0;

/** Whether the margin reaches past any side of the box at all. */
export const hasVisualMargin = (
	margin: LayoutVisualMargin | undefined,
): margin is LayoutVisualMargin =>
	margin !== undefined &&
	LAYOUT_SIDES.some((side) => readVisualMargin(margin, side) > 0);

/** Refuse a node whose margin is not a finite number of 0 or more on every side it gives. */
export const requireVisualMargin = ({
	id,
	visualMargin,
}: LayoutGraphNode): void => {
	if (visualMargin === undefined) {
		return;
	}
	for (const side of LAYOUT_SIDES) {
		const value = visualMargin[side];
		if (value !== undefined && !(Number.isFinite(value) && value >= 0)) {
			throw new Error(
				`node ${id} has a visualMargin.${side} that is not a finite number of 0 or more: ${value}`,
			);
		}
	}
};

/** The box grown by its margin on every side, in the box's coordinates. */
export const growByVisualMargin = (
	box: Rect,
	margin: LayoutVisualMargin | undefined,
): Rect => {
	const top = readVisualMargin(margin, "top");
	const left = readVisualMargin(margin, "left");
	return {
		x: box.x - left,
		y: box.y - top,
		width: box.width + left + readVisualMargin(margin, "right"),
		height: box.height + top + readVisualMargin(margin, "bottom"),
	};
};
