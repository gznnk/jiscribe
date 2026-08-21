import {
	BODY_TEXT_SLOT_ID,
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "@jiscribe/doc/unstable";
import type { Dimensions, Rect } from "@jiscribe/geometry";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";

/**
 * A shape as {@link contentBox} needs to see it: its type name, its box, and
 * whatever else its own text region reads — the callout's `tail`, the
 * container's `headerHeight`. A parsed `ObjectDoc` with a stored size is one;
 * so is a hand-built `{ type, width, height }` for a size nobody has drawn yet.
 */
export type ContentBoxShape = Dimensions & {
	/** Object type name, as the document spells it (`"stadium"`, `"callout"`). */
	type: string;
} & Readonly<Record<string, unknown>>;

/**
 * The area a shape's text is actually laid out in: the region its type declares
 * (`ObjectDocDefinition.textRegion`, the same calculator the canvas draws and
 * edits in), minus the padding every text box has ({@link TEXT_BOX_PADDING_X} /
 * {@link TEXT_BOX_PADDING_Y}). This is the width to wrap at and the height to
 * fit into — the pair {@link import("./diagnoseDoc").diagnoseDoc} compares a
 * measurement against.
 *
 * The rectangle is in the shape's own coordinates, whose origin is the centre of
 * the bounding box (the convention the shipped regions use), so a shape whose
 * region is the whole box returns `{ x: -width / 2 + 6, y: -height / 2 + 2, … }`.
 *
 * @param shape - The object to measure: its `type`, its `width` / `height`, and any field its type's region reads (see {@link ContentBoxShape})
 * @returns The content rectangle, its width and height clamped at 0 for a box too small to hold any; null for a type whose text the box does not hold — a label drawn outside the outline, bands sized from their own text, no text at all — and for a type outside the shipped set, which declares nothing
 */
export const contentBox = <TShape extends ContentBoxShape>(
	shape: TShape,
): Rect | null => {
	const region = standardObjectDocDefinitions
		.get(shape.type)
		?.textRegion?.(shape, BODY_TEXT_SLOT_ID);
	if (region === null || region === undefined) {
		return null;
	}
	return {
		x: region.x + TEXT_BOX_PADDING_X,
		y: region.y + TEXT_BOX_PADDING_Y,
		width: Math.max(0, region.width - TEXT_BOX_PADDING_X * 2),
		height: Math.max(0, region.height - TEXT_BOX_PADDING_Y * 2),
	};
};
