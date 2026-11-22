import type { ObjectLabelBackdropRegion } from "@jiscribe/canvas";
import { resolveAutoColor } from "@jiscribe/canvas-sdk";

import { calcContainerHeaderHeight } from "../schema/calcContainerHeaderHeight";
import type { ContainerState } from "../state/ContainerState";

/**
 * The header band as a container paints it: across the top of the box, as tall
 * as calcContainerHeaderHeight, in `headerFill` and at the body's opacity. The
 * one answer Container draws and calcContainerLabelBackdrop reports.
 *
 * @param state - The container; its untransformed box, `headerHeight` and `headerFill` are read. `headerFill` omitted or `"auto"` is the theme surface, independent of the body's `fill`
 * @param fillAlpha - The body's resolved fill opacity, 0 to 1, which the band shares
 * @returns The band in the shape's local coordinates (origin at the center), with its resolved color
 */
export const calcContainerHeaderBand = (
	state: Pick<
		ContainerState,
		"width" | "height" | "headerHeight" | "headerFill"
	>,
	fillAlpha: number,
): ObjectLabelBackdropRegion => ({
	rect: {
		x: -state.width / 2,
		y: -state.height / 2,
		width: state.width,
		height: calcContainerHeaderHeight(state),
	},
	fill: resolveAutoColor(state.headerFill, "surface"),
	fillOpacity: fillAlpha,
});
