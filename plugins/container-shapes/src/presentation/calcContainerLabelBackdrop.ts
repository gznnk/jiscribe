import type { ObjectLabelBackdropRegion } from "@jiscribe/canvas";
import { resolveAutoColor } from "@jiscribe/canvas-sdk";

import { calcContainerHeaderHeight } from "../schema/calcContainerHeaderHeight";
import type { ContainerState } from "../state/ContainerState";

/**
 * What a container paints under the `"auto"` labels lying on it, as Container
 * draws it: the body over the whole box, then the header band over its top, in
 * `headerFill` and the body's opacity.
 *
 * @param state - The container; its untransformed box, `headerHeight` and `headerFill` are read
 * @param style - The body fill as core resolved it, `"auto"` already the theme surface
 */
export const calcContainerLabelBackdrop = (
	state: ContainerState,
	style: { fillColor: string; fillAlpha: number },
): readonly ObjectLabelBackdropRegion[] => {
	const x = -state.width / 2;
	const y = -state.height / 2;
	return [
		{
			rect: { x, y, width: state.width, height: state.height },
			fill: style.fillColor,
			fillOpacity: style.fillAlpha,
		},
		{
			rect: {
				x,
				y,
				width: state.width,
				height: calcContainerHeaderHeight(state),
			},
			fill: resolveAutoColor(state.headerFill, "surface"),
			fillOpacity: style.fillAlpha,
		},
	];
};
