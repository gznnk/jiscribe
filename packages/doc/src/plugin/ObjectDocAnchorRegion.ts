import type { Dimensions, Rect } from "@jiscribe/geometry";

/**
 * Calculates the rect a shape's edge anchors are centered on, in the shape's
 * local coordinates (origin at the center of the bounding box, untransformed,
 * top-left based Rect), from its untransformed width/height plus whatever fields
 * it depends on. The rect only moves where an anchor's ray starts — where the
 * anchor lands is still decided by the outline — so a silhouette that tapers
 * (the off-page connector's bottom tip) keeps its left/right anchors on the
 * middle of the body instead of the bounding box. An edge anchor's `t` is
 * measured along this rect's side, not the bounding box's. Distinct from the
 * text region, which may additionally inset for readability.
 *
 * Reads only fields a doc and a canvas state of the type both carry under the
 * same name and in the same form: the canvas calls it with the state, the doc
 * layer with the doc, and both must get the same rect.
 *
 * Implementations declare what they read through `TDoc` and stay assignable to
 * this type as long as every field beyond the box is optional.
 */
export type ObjectDocAnchorRegionCalculator<
	TDoc extends Dimensions = Dimensions,
> = (doc: TDoc) => Rect;
