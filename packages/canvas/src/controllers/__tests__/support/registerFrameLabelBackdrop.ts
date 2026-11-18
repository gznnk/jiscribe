import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasRegistries } from "../../registries/CanvasRegistries";

/**
 * Registers the `"frame"` type the label-backdrop tests draw labels on: one
 * region over its whole `width` × `height` box, centered on its center, in its
 * resolved body fill.
 */
export const registerFrameLabelBackdrop = (
	registries: Pick<CanvasRegistries, "objectLabelBackdrop">,
): void => {
	registries.objectLabelBackdrop.register("frame", (state, style) => {
		const { width, height } = state as ObjectState & {
			width: number;
			height: number;
		};
		return [
			{
				rect: { x: -width / 2, y: -height / 2, width, height },
				fill: style.fillColor,
				fillOpacity: style.fillAlpha,
			},
		];
	});
};
