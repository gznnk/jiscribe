import { BODY_TEXT_SLOT_ID, calcTextContentBox } from "@jiscribe/doc/unstable";
import type { Dimensions, Rect } from "@jiscribe/geometry";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";

/**
 * A shape as {@link resolveContentBox} needs to see it: its type name, its box,
 * and whatever else its own text region reads — the callout's `tail`, the
 * container's `headerHeight`. A parsed `ObjectDoc` with a stored size is one;
 * so is a hand-built `{ type, width, height }` for a size nobody has drawn yet.
 */
export type ContentBoxShape = Dimensions & {
	/** Object type name, as the document spells it (`"stadium"`, `"callout"`). */
	type: string;
} & Readonly<Record<string, unknown>>;

/**
 * The three answers {@link resolveContentBox} tells apart. A consumer wanting a
 * rectangle handles `region`; the other two are different enough to report
 * differently — `outside` is a fact about the shape, `unknown` is a mistake in
 * the type name.
 */
export type ContentBoxResolution =
	| {
			/** The type declares a region and the shape's box leaves some of it. */
			kind: "region";
			/**
			 * The content rectangle in the shape's own coordinates (origin at the
			 * centre of the bounding box), width and height clamped at 0.
			 */
			rect: Rect;
	  }
	| {
			/**
			 * The type's box does not hold its text: the label is drawn outside the
			 * outline, the box is divided into bands each sized from their own text,
			 * or the type carries no text at all. No width and height can make such a
			 * text overflow.
			 */
			kind: "outside";
	  }
	| {
			/** No type of that name in the shipped set, so nothing declares anything. */
			kind: "unknown";
	  };

/**
 * Where a shape's text is actually laid out: the region its type declares
 * (`ObjectDocDefinition.textRegion`, the same calculator the canvas draws and
 * edits in), minus the padding every text box has ({@link calcTextContentBox}).
 * A `region`'s rectangle is the width to wrap at and
 * the height to fit into — the pair {@link import("./diagnoseDoc").diagnoseDoc}
 * compares a measurement against.
 *
 * The rectangle is in the shape's own coordinates, whose origin is the centre of
 * the bounding box (the convention the shipped regions use), so a shape whose
 * region is the whole box resolves to `{ x: -width / 2 + 6, y: -height / 2 + 2, … }`.
 *
 * @param shape - The object to measure: its `type`, its `width` / `height`, and any field its type's region reads (see {@link ContentBoxShape})
 * @returns `{ kind: "region", rect }` for a type whose box holds its text, `{ kind: "outside" }` for one whose box does not (a label drawn outside the outline, bands sized from their own text, no text at all, or a shipped type that declares no region), and `{ kind: "unknown" }` for a type name outside the shipped set
 */
export const resolveContentBox = <TShape extends ContentBoxShape>(
	shape: TShape,
): ContentBoxResolution => {
	const definition = standardObjectDocDefinitions.get(shape.type);
	if (definition === undefined) {
		return { kind: "unknown" };
	}
	const region = definition.textRegion?.(shape, BODY_TEXT_SLOT_ID) ?? null;
	if (region === null) {
		return { kind: "outside" };
	}
	return { kind: "region", rect: calcTextContentBox(region) };
};
