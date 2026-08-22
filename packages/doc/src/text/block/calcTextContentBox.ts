import type { Rect } from "@jiscribe/geometry";

import { TEXT_BOX_PADDING_X, TEXT_BOX_PADDING_Y } from "./textBoxPadding";

/**
 * The rectangle text is actually laid out in inside a region a shape declares
 * (`ObjectDocDefinition.textRegion`, which carries no padding): the region minus
 * the inner padding every text box is drawn with. Its width is the width to wrap
 * at and its height the height to fit into.
 *
 * @param region - Region in the shape's own coordinates (origin at the centre of the bounding box), as the type's `textRegion` returns it
 * @returns The same rectangle inset by the padding, its sides clamped at 0 so a region narrower than its own padding yields an empty box rather than a negative one
 */
export const calcTextContentBox = (region: Rect): Rect => ({
	x: region.x + TEXT_BOX_PADDING_X,
	y: region.y + TEXT_BOX_PADDING_Y,
	width: Math.max(0, region.width - TEXT_BOX_PADDING_X * 2),
	height: Math.max(0, region.height - TEXT_BOX_PADDING_Y * 2),
});
