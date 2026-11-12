import type { ObjectLabelBackdropRegion } from "@jiscribe/canvas";

import type { AwsGroupState } from "../state/AwsGroupState";

/**
 * What awsGroup paints under the `"auto"` labels lying on it: its body, the
 * whole box, in the fill AwsGroup draws it with.
 *
 * @param state - The group; only its untransformed width and height are read
 * @param style - The body fill as core resolved it, `"auto"` already the theme surface
 */
export const calcAwsGroupLabelBackdrop = (
	state: AwsGroupState,
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
];
