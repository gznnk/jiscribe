import {
	isCaptionText,
	isSingleBodyText,
	isTextVerticalBasis,
} from "@jiscribe/doc";
import {
	applyTextVerticalBasis,
	BODY_TEXT_SLOT_ID,
	calcTextContentBox,
} from "@jiscribe/doc/unstable";
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
			 * centre of the bounding box), width and height clamped at 0. Vertically
			 * this is the box the shape's `textVerticalBasis` names, so a `"frame"`
			 * shape's is the whole height rather than the declared region's.
			 */
			rect: Rect;
			/**
			 * The type's declared region as it comes out of `textRegion`: padding
			 * still on it and the basis not applied. The safe area the type promises
			 * its own decoration stays out of, which is what tells a `"frame"` body
			 * riding over a cylinder's cap from one that does not.
			 */
			declaredRegion: Rect;
			/**
			 * True for a type that lays its body out itself (`features.text:
			 * "source"`, Markdown as HTML): the rectangle is still where it is drawn,
			 * but text measured into it as plain lines is only a lower bound on what
			 * the drawn body takes.
			 */
			isSourceText: boolean;
	  }
	| {
			/**
			 * The type's box does not hold one body of text: its caption is sized
			 * from its own text (`features.text: "label"` / `"innerLabel"`), its text is keyed slots,
			 * or it carries no text at all. No width and height can make such a text
			 * overflow.
			 */
			kind: "outside";
	  }
	| {
			/** No type of that name in the shipped set, so nothing declares anything. */
			kind: "unknown";
	  };

/**
 * Where a shape's text is actually laid out: the box its `textVerticalBasis`
 * names — the region its type declares for the body (`ObjectDocDefinition.textRegion`
 * asked for `body`), or the shape's whole height
 * with that region's width ({@link applyTextVerticalBasis}) — minus the padding
 * every text box has ({@link calcTextContentBox}). A `region`'s rectangle is the
 * width to wrap at and the height to fit into — the pair
 * {@link import("./diagnoseDoc").diagnoseDoc} compares a measurement against.
 *
 * The rectangle is in the shape's own coordinates, whose origin is the centre of
 * the bounding box (the convention the shipped regions use), so a shape whose
 * region is the whole box resolves to `{ x: -width / 2 + 6, y: -height / 2 + 2, … }`.
 *
 * @param shape - The object to measure: its `type`, its `width` / `height`, its `textVerticalBasis` if it sets one, and any field its type's region reads (see {@link ContentBoxShape})
 * @returns `{ kind: "region", rect, declaredRegion, isSourceText }` for a `"body"` / `"source"` type, whose box holds its one body; `{ kind: "outside" }` for a `"label"` / `"innerLabel"` type (its caption sized from its own text), a `"slots"` type whose text is not one body, and one with no text at all; and `{ kind: "unknown" }` for a type name outside the shipped set
 */
export const resolveContentBox = <TShape extends ContentBoxShape>(
	shape: TShape,
): ContentBoxResolution => {
	const definition = standardObjectDocDefinitions.get(shape.type);
	if (definition === undefined) {
		return { kind: "unknown" };
	}
	// The box asked about is the one body's: a caption is sized from its own text
	// wherever the type places it, and a type whose text is keyed slots has no
	// single body to place, whatever its region declares for a slot.
	if (
		isCaptionText(definition.features.text) ||
		!isSingleBodyText(definition.features.text)
	) {
		return { kind: "outside" };
	}
	// Narrows the type only: a "body" / "source" type always declares one
	// (resolveDocDefinitions refuses it otherwise), so this is never taken.
	if (definition.textRegion === undefined) {
		return { kind: "outside" };
	}
	const region = definition.textRegion(shape, BODY_TEXT_SLOT_ID);
	// An unknown value reads as the default rather than as an error: this package
	// also runs over documents the parser has not stripped (a hand-built shape,
	// `measure`'s size probes), and the field is a pure enum there too.
	const basis = isTextVerticalBasis(shape.textVerticalBasis)
		? shape.textVerticalBasis
		: undefined;
	return {
		kind: "region",
		rect: calcTextContentBox(applyTextVerticalBasis(region, shape, basis)),
		declaredRegion: region,
		isSourceText: definition.features.text === "source",
	};
};

/**
 * What a measurement of plain text into a `region` marked `isSourceText` is
 * reported with in place of a fit verdict, worded once for `jiscribe measure`
 * and the MCP `measure_text` tool. It names `measure_rendered_text`, the MCP
 * tool that measures the drawn body.
 *
 * @param shape - Object type name as the caller spelled it, quoted into the note as is
 * @returns One sentence with no `note:` prefix and no trailing newline
 */
export const formatSourceTextMeasureNote = (shape: string): string =>
	`shape ${shape} lays its body out as HTML (headings, lists and spacing), so these plain-text numbers are only a lower bound on what it takes; to measure it as drawn, open the canvas in the jiscribe MCP viewer and call measure_rendered_text`;
