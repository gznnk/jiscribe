import type { Dimensions, Point } from "@jiscribe/geometry";

/**
 * Produces a shape's true outline (the drawn silhouette, not the bounding box)
 * as a closed polygon in the shape's local coordinates — origin at the center of
 * the bounding box, untransformed — from its untransformed width/height plus
 * whatever fields the silhouette depends on (the callout's `tail`). Curved
 * shapes return a sampled polyline. What a connector end and a connection anchor
 * land on, and what an automatic layout keeps its edge anchors on.
 *
 * Reads only fields a doc and a canvas state of the type both carry under the
 * same name and in the same form: the canvas calls it with the state, the doc
 * layer with the doc, and both must get the same polygon.
 *
 * Implementations declare what they read through `TDoc` and stay assignable to
 * this type as long as every field beyond the box is optional (the callout's
 * `Pick<CalloutDoc, "width" | "height" | "tail">`).
 */
export type ObjectDocOutlineCalculator<TDoc extends Dimensions = Dimensions> = (
	doc: TDoc,
) => Point[];
