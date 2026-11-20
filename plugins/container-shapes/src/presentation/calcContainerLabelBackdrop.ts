import type { ObjectLabelBackdropRegion } from "@jiscribe/canvas";

import { calcContainerHeaderBand } from "./calcContainerHeaderBand";
import type { ContainerState } from "../state/ContainerState";

/**
 * What a container paints under the `"auto"` labels lying on it, as Container
 * draws it: the body over the whole box, then the header band over its top
 * (calcContainerHeaderBand).
 *
 * @param state - The container; its untransformed box, `headerHeight` and `headerFill` are read
 * @param style - The body fill as core resolved it, `"auto"` already the theme surface
 */
export const calcContainerLabelBackdrop = (
	state: ContainerState,
	style: { fillColor: string; fillAlpha: number },
): readonly ObjectLabelBackdropRegion[] => [
	{
		rect: {
			x: -state.width / 2,
			y: -state.height / 2,
			width: state.width,
			height: state.height,
		},
		fill: style.fillColor,
		fillOpacity: style.fillAlpha,
	},
	calcContainerHeaderBand(state, style.fillAlpha),
];
