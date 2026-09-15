import type { StencilIconProps } from "@jiscribe/canvas";
import { createStencilIcon } from "@jiscribe/canvas-sdk";
import type { NamedExoticComponent } from "react";

import { AwsIconArt } from "../presentation/AwsIconArt";
import {
	calcAwsIconArtPlacement,
	readViewBoxSize,
} from "../presentation/calcAwsIconArtPlacement";
import { readAwsIcon } from "../schema/icon/resolveAwsIconName";

/**
 * Side of the `<svg>` createStencilIcon provides. Asset viewBoxes are 40 / 48 /
 * 64 depending on the layer, so they are scaled down to it.
 */
const STENCIL_ICON_SIZE = 24;

/**
 * Builds one palette glyph. It can only be made from an icon the asset package
 * has, so the palette never shows one that does not exist.
 *
 * @param name - the canonical icon name; one that resolves to nothing gives a
 *   glyph that draws nothing
 * @returns the memoized component a `Stencil`'s `icon` takes
 */
export const createAwsStencilIcon = (
	name: string,
): NamedExoticComponent<StencilIconProps> => {
	const entry = readAwsIcon(name);
	if (entry === null) {
		return createStencilIcon(<g />);
	}
	const viewBox = readViewBoxSize(entry.viewBox);
	const { scale } = calcAwsIconArtPlacement(
		STENCIL_ICON_SIZE,
		STENCIL_ICON_SIZE,
		viewBox.width,
		viewBox.height,
	);
	return createStencilIcon(
		<g transform={`scale(${scale})`}>
			<AwsIconArt entry={entry} />
		</g>,
	);
};
