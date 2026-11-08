import type { Dimensions, Rect } from "@jiscribe/geometry";

/**
 * Calculates the rectangle one text slot of a shape is laid out in, from the
 * shape's own doc: its untransformed width/height plus whatever fields the
 * outline depends on (the callout's `tail`, the container's `headerHeight`).
 * `slotId` is a key of the shape's text — `body` for a single-body shape, a cell
 * or a band id for a `"slots"` one. The rectangle is in the shape's local
 * coordinates, origin at the center of the bounding box, and carries no text-box
 * padding — a consumer measuring against it subtracts `TEXT_BOX_PADDING_X` /
 * `TEXT_BOX_PADDING_Y` itself.
 *
 * Implementations declare what they read through `TDoc` and take only the
 * parameters they use: a single-body shape's calculator is a one-argument
 * function of its box, and stays assignable to this type. The canvas calls the
 * same declaration with an object's state only to measure an auto-height body
 * (resizeAutoHeightStateToContent), so read only the width/height and the type's
 * own fields (`extraKeys`), which a state carries too. Where the canvas draws
 * the text is the UI definition's `"textSlot"` part kind; the shipped shapes pass
 * the same function to both sides.
 */
export type ObjectDocTextRegionCalculator<
	TDoc extends Dimensions = Dimensions,
> = (doc: TDoc, slotId: string) => Rect;

/**
 * The whole bounding box: what a shape whose outline takes nothing off its text
 * declares (`rect`, `sticky`, `markdown`).
 *
 * @param doc - The shape's untransformed box; a zero side yields a zero-sided rect rather than NaN
 * @returns The bounding box in local coordinates (shape center as origin)
 */
export const calcFullBoxTextRegion = ({ width, height }: Dimensions): Rect => ({
	x: -width / 2,
	y: -height / 2,
	width,
	height,
});
