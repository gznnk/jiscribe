import type { Dimensions, Rect } from "@jiscribe/geometry";

import type { TextVerticalBasis } from "../../model/objects/types/TextVerticalBasis";

/**
 * Puts a body text's region on the box its `textVerticalBasis` names, which is
 * the one seam the three sides that place text share: the canvas overlay and its
 * editor (through `calcTextRegion`), image export (which draws what the overlay
 * laid out), and the fit checks in `@jiscribe/doc-tools`.
 *
 * Only the vertical extent is swapped. The horizontal one stays the region's
 * however the basis reads, because that is where a type's own outline actually
 * cuts into the line — a stadium's caps, a parallelogram's slant — and a text
 * spilling sideways is unreadable in a way a text riding over a cylinder's cap
 * is not.
 *
 * The height a shape with no `height` in the document is drawn at is derived
 * from the declared region alone and is unaffected by this
 * (`calcAutoShapeHeight`): the basis moves where the text is drawn, not how much
 * room the shape is given.
 *
 * @param region - The type's declared region for the slot, in the shape's own coordinates (origin at the centre of the bounding box), as `ObjectDocDefinition.textRegion` returns it; a flipped shape's may be negative in width
 * @param shape - The shape being drawn; only `height` is read, and only for the `"frame"` basis
 * @param basis - The object's `textVerticalBasis`; `undefined` — the field absent, which is every document written before it existed — means `"region"`
 * @returns `region` itself for the `"region"` basis (so callers can detect the no-change case by reference), otherwise the same horizontal extent over the shape's full height
 */
export const applyTextVerticalBasis = (
	region: Rect,
	shape: Dimensions,
	basis: TextVerticalBasis | undefined,
): Rect =>
	basis === "frame"
		? {
				x: region.x,
				y: -shape.height / 2,
				width: region.width,
				height: shape.height,
			}
		: region;
