import type { Dimensions, Rect } from "@jiscribe/geometry";

/**
 * Calculates the rectangle a shape's text is laid out in, from the shape's own
 * doc: its untransformed width/height plus whatever fields the outline depends
 * on (the callout's `tail`, the container's `headerHeight`). The rectangle is in
 * the shape's local coordinates, origin at the center of the bounding box, and
 * carries no text-box padding — a consumer measuring against it subtracts
 * `TEXT_BOX_PADDING_X` / `TEXT_BOX_PADDING_Y` itself.
 *
 * Implementations declare what they read through `TDoc` and take only the
 * parameters they use: a single-body shape's calculator is a one-argument
 * function of its box, and stays assignable to this type. The pair of parameters
 * mirrors the rendering layer's `ObjectTextRegionCalculator` (`@jiscribe/canvas`)
 * so that one is assignable to this one, which is what keeps a UI definition
 * structurally a doc definition.
 *
 * `null` means the box does not hold the text at all — the shape draws its label
 * outside the outline, or divides the box into bands each sized from its own
 * text. Nothing about such a shape's width and height can make its text
 * overflow.
 */
export type ObjectDocTextRegionCalculator<
	TDoc extends Dimensions = Dimensions,
> = (doc: TDoc, slotId: string) => Rect | null;

/**
 * The whole bounding box: what a shape whose outline takes nothing off its text
 * declares (`rect`, `sticky`, `markdown`).
 *
 * Typed as returning a plain `Rect` rather than the nullable declaration type, so
 * the same function serves as the UI definition's `textRegion` as well.
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

/**
 * No region at all: what a shape declares when its box does not hold its text —
 * a label drawn outside the outline (the pictograms, the group markers), bands
 * each sized from their own text (`record`), or a type carrying no text.
 *
 * @param doc - The shape's untransformed box; unread, the answer being the same at every size
 * @returns Always null
 */
export const calcOutsideBoxTextRegion: ObjectDocTextRegionCalculator<
	Dimensions
> = () => null;
