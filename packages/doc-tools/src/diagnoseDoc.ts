import type {
	CanvasDoc,
	ObjectDoc,
	ObjectDocDefinition,
	RichText,
} from "@jiscribe/doc";
import { richTextToPlain, supportsAutoHeight } from "@jiscribe/doc";
import type { TextMeasureFont, VisualLine } from "@jiscribe/doc/unstable";
import {
	calcAutoShapeHeight,
	DEFAULT_FONT_FAMILY,
	TEXT_LINE_HEIGHT,
	TEXT_STYLE_FALLBACK,
} from "@jiscribe/doc/unstable";
import type { Rect } from "@jiscribe/geometry";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";

import {
	calcConnectorLabelFit,
	indexObjectsById,
	resolveConnectorLabel,
} from "./connectorLabelFit";
import type { Diagnostic } from "./Diagnostic";
import {
	describeLineStartProhibitions,
	findLineStartProhibitions,
} from "./lineStartProhibition";
import {
	calcWrappedTextMetrics,
	layoutTextLines,
	offerNodeTextMeasurement,
} from "./measureWrappedText";
import { resolveContentBox } from "./resolveContentBox";

/**
 * Height a text may exceed its content box by before a reader sees anything, in
 * local pixels.
 *
 * What clips is the text region, and what the measurement adds up is line boxes
 * — which are taller than the glyphs by the leading, `fontSize × (lineHeight - 1)`,
 * split half above the first line and half below the last. A block centred in its
 * region therefore loses leading before it loses ink. Half the leading is taken
 * here rather than all of it, both because a top-aligned block spends its whole
 * excess at the bottom and because descenders reach past the em box.
 *
 * @param fontSize - Type size of the block in local pixels
 */
const calcOverflowTolerance = (fontSize: number): number =>
	(fontSize * (TEXT_LINE_HEIGHT - 1)) / 2;

/** The whole document's objects, group children included, in document order. */
const flattenObjects = (objects: readonly ObjectDoc[]): ObjectDoc[] =>
	objects.flatMap((object) => {
		const children = (object as { children?: ObjectDoc[] }).children;
		return Array.isArray(children)
			? [object, ...flattenObjects(children)]
			: [object];
	});

/** A single-body doc's own style fields, which sit flat on the object. */
type TextBodyDoc = ObjectDoc & {
	text?: RichText;
	textLayout?: string;
	textVerticalBasis?: string;
	verticalAlign?: string;
	width?: number;
	height?: number;
	fontSize?: number;
	fontFamily?: string;
	fontWeight?: string;
	fontStyle?: string;
};

/**
 * The font the object's body is drawn with: what the document sets, over what
 * its type declares, over the canvas-wide last resort. The family has no
 * constant last resort (an unset one follows the host theme), so the built-in
 * default stands in — which is what an unthemed canvas draws.
 */
const resolveBodyFont = (
	object: TextBodyDoc,
	definition: ObjectDocDefinition,
): TextMeasureFont => {
	const typeDefaults = definition.textSlotStyleDefaults?.body;
	return {
		fontSize:
			object.fontSize ?? typeDefaults?.fontSize ?? TEXT_STYLE_FALLBACK.fontSize,
		fontFamily:
			object.fontFamily ?? typeDefaults?.fontFamily ?? DEFAULT_FONT_FAMILY,
		fontWeight:
			object.fontWeight ??
			typeDefaults?.fontWeight ??
			TEXT_STYLE_FALLBACK.fontWeight,
		fontStyle:
			object.fontStyle ??
			typeDefaults?.fontStyle ??
			TEXT_STYLE_FALLBACK.fontStyle,
	};
};

/**
 * Where in its box the object's body sits: what the document sets, over what its
 * type declares for its body slot, over the canvas-wide last resort — the same
 * three-step resolution the overlay makes (`resolveTextSlotStyle`).
 */
const resolveBodyVerticalAlign = (
	object: TextBodyDoc,
	definition: ObjectDocDefinition,
): string =>
	object.verticalAlign ??
	definition.textSlotStyleDefaults?.body?.verticalAlign ??
	TEXT_STYLE_FALLBACK.verticalAlign;

const round = (value: number): number => Math.round(value * 10) / 10;

/**
 * Box width the object's body wraps in, padding included, or null where nothing
 * wraps it and the text is drawn at whatever width it comes to.
 */
const resolveWrapBoxWidth = (
	body: TextBodyDoc,
	definition: ObjectDocDefinition,
): number | null => {
	if (typeof body.width !== "number") {
		return null;
	}
	if (definition.features.geometry === "rect") {
		return body.width;
	}
	// `text` is the one text-bearing type that stores no box, and the width it
	// does store is read in the block layout alone — the label layout is measured
	// from the text and breaks at authored newlines only (canvas TextMapper).
	return body.textLayout === "block" ? body.width : null;
};

/**
 * Height the shape is drawn at: the stored one, or the one its text comes to for
 * a type allowed to leave it out. Null where the type holds the text at no height
 * at all, there being nothing to check against then.
 *
 * @param boxWidth - The width its text wraps in, as {@link resolveWrapBoxWidth} resolved it rather than the shape's own
 */
const resolveDrawnHeight = (
	body: TextBodyDoc,
	definition: ObjectDocDefinition,
	boxWidth: number,
	text: RichText,
	font: TextMeasureFont,
): number | null => {
	if (typeof body.height === "number") {
		return body.height;
	}
	if (definition.textRegion === undefined || !supportsAutoHeight(definition)) {
		// A type storing no height at all (`text` in its block layout) has none to
		// derive. Only the region's width is read from here on, and no shipped
		// region takes a width from the height, so 0 stands in for the height
		// nobody has measured.
		return 0;
	}
	// The search lays text out through the doc layer rather than through this
	// package's measurer, so the font files have to be on offer before it runs.
	offerNodeTextMeasurement();
	return calcAutoShapeHeight(
		{ ...body, width: boxWidth, height: 0 },
		text,
		font,
		definition.textRegion,
	);
};

/** What the drawn lines say about the text fitting the box, empty when it does. */
const diagnoseTextOverflow = (
	object: ObjectDoc,
	size: { width: number; height: number },
	box: Rect,
	font: TextMeasureFont,
	lines: readonly VisualLine[],
): Diagnostic[] => {
	const metrics = calcWrappedTextMetrics(lines);
	const diagnostics: Diagnostic[] = [];
	if (metrics.height > box.height + calcOverflowTolerance(font.fontSize)) {
		diagnostics.push({
			severity: "error",
			objectId: object.id,
			message: `text overflows ${object.type} ${size.width}x${size.height}: ${metrics.lines} line(s) need ${round(metrics.height)}px but the content box is ${round(box.height)}px tall (content box ${round(box.width)}x${round(box.height)}, font ${font.fontSize}px)`,
		});
	}
	// Wrapping cannot exceed the width it wraps at, so this only fires where a
	// single unbreakable character is wider than the box — the box being too
	// narrow for the type size at all, which no extra height would fix.
	// Half a pixel of slack for the rounding between a measured advance and the
	// subpixel width a browser lays the same glyphs out at.
	if (metrics.width > box.width + 0.5) {
		diagnostics.push({
			severity: "error",
			objectId: object.id,
			message: `text is too wide for ${object.type} ${size.width}x${size.height}: the narrowest line is ${round(metrics.width)}px but the content box is ${round(box.width)}px wide (font ${font.fontSize}px)`,
		});
	}
	return diagnostics;
};

/**
 * Top edge of the drawn text block inside its content box, in the shape's own
 * coordinates. The numeric form of what the overlay leaves to CSS
 * (`verticalAlignToAlignItems`), which is why the three cases spell out
 * flex-start / center / flex-end rather than deriving one from another.
 *
 * @param box - The content box the block is placed in, as `resolveContentBox` returns it
 * @param blockHeight - Total height of the laid-out lines, leading included
 * @param verticalAlign - The slot's resolved alignment; an unknown value is placed as the canvas-wide fallback does ("middle")
 */
const calcTextBlockTop = (
	box: Rect,
	blockHeight: number,
	verticalAlign: string,
): number => {
	if (verticalAlign === "top") {
		return box.y;
	}
	if (verticalAlign === "bottom") {
		return box.y + box.height - blockHeight;
	}
	return box.y + (box.height - blockHeight) / 2;
};

/**
 * What placing a body on the shape's whole height costs it, empty while the
 * block still sits inside the region its type declares.
 *
 * The oracle is the declared region and nothing else: a type's `textRegion` is
 * where its author promises the shape's own decoration is not — a cylinder's
 * caps, a document's wavy foot — so leaving it is exactly the fact worth
 * reporting. No outline path is intersected, deliberately: the outlines are
 * arbitrary curves per type, and a geometric test against them would answer a
 * question the region already answers, in a way each new shape would have to
 * re-earn.
 *
 * A warning rather than an error: the text is still fully drawn and still
 * readable over most decoration, and the basis was asked for on purpose.
 *
 * @param box - The content box the body is actually drawn in, the whole shape minus the padding for the basis this check exists for
 * @param declaredRegion - The type's own region, padding still on it, as `resolveContentBox` reports it beside the box
 * @param verticalAlign - The slot's resolved alignment, which decides where in `box` the block sits
 */
const diagnoseDecorationOverlap = (
	object: ObjectDoc,
	box: Rect,
	declaredRegion: Rect,
	font: TextMeasureFont,
	lines: readonly VisualLine[],
	verticalAlign: string,
): Diagnostic[] => {
	const blockHeight = calcWrappedTextMetrics(lines).height;
	const blockTop = calcTextBlockTop(box, blockHeight, verticalAlign);
	const blockBottom = blockTop + blockHeight;
	const regionBottom = declaredRegion.y + declaredRegion.height;
	// The same half-leading the overflow check allows: a block's first and last
	// line boxes carry it as whitespace, so that much past an edge is not ink.
	const tolerance = calcOverflowTolerance(font.fontSize);
	const overshoot = Math.max(
		declaredRegion.y - blockTop,
		blockBottom - regionBottom,
	);
	if (overshoot <= tolerance) {
		return [];
	}
	return [
		{
			severity: "warning",
			objectId: object.id,
			message: `text in ${object.type} is placed on the whole shape (textVerticalBasis "frame") and reaches ${round(overshoot)}px past the region ${object.type} keeps clear of its own decoration, so the two may overlap (text spans ${round(blockTop)}..${round(blockBottom)}, region ${round(declaredRegion.y)}..${round(regionBottom)}, font ${font.fontSize}px)`,
		},
	];
};

/**
 * The finding about where an object's body breaks, empty when every break falls
 * somewhere Japanese typesetting allows. One diagnostic however many lines
 * offend: they are all the same remark about the same text, and the author fixes
 * them by rewriting or resizing once.
 */
const diagnoseObjectTextLineStarts = (
	object: ObjectDoc,
	text: RichText,
	box: Rect,
	font: TextMeasureFont,
	lines: readonly VisualLine[],
): Diagnostic[] => {
	const prohibitions = findLineStartProhibitions(text, lines);
	if (prohibitions.length === 0) {
		return [];
	}
	return [
		{
			severity: "warning",
			objectId: object.id,
			message: `text in ${object.type} breaks a line before a character Japanese typesetting keeps off a line head: ${describeLineStartProhibitions(prohibitions)} (content box ${round(box.width)}px wide, font ${font.fontSize}px)`,
		},
	];
};

/** Every finding about one object's text, empty when it fits and breaks well. */
const diagnoseObjectText = (object: ObjectDoc): Diagnostic[] => {
	const definition = standardObjectDocDefinitions.get(object.type);
	if (definition?.features.text !== "body") {
		return [];
	}
	const body = object as TextBodyDoc;
	const text = body.text;
	if (text === undefined || richTextToPlain(text) === "") {
		return [];
	}
	const boxWidth = resolveWrapBoxWidth(body, definition);
	if (boxWidth === null) {
		return [];
	}
	if (definition.textRegion === undefined) {
		return [
			{
				severity: "warning",
				objectId: object.id,
				message: `${object.type} declares no text region, so its text is not checked against the shape (ObjectDocDefinition.textRegion)`,
			},
		];
	}
	const font = resolveBodyFont(body, definition);
	const drawnHeight = resolveDrawnHeight(
		body,
		definition,
		boxWidth,
		text,
		font,
	);
	if (drawnHeight === null) {
		return [];
	}
	const resolution = resolveContentBox({
		...body,
		width: boxWidth,
		height: drawnHeight,
	});
	if (resolution.kind !== "region") {
		return [];
	}
	const box = resolution.rect;
	const lines = layoutTextLines(text, font, box.width);
	return [
		// Only a stored height can be overflowed: a shape leaving it out is drawn
		// at whatever height its text needs (calcAutoShapeHeight).
		...(typeof body.height === "number"
			? diagnoseTextOverflow(
					object,
					{ width: boxWidth, height: body.height },
					box,
					font,
					lines,
				)
			: []),
		// Only the frame basis has anything to check: a body placed on the declared
		// region is laid out inside that very region and cannot leave it.
		...(body.textVerticalBasis === "frame"
			? diagnoseDecorationOverlap(
					object,
					box,
					resolution.declaredRegion,
					font,
					lines,
					resolveBodyVerticalAlign(body, definition),
				)
			: []),
		...diagnoseObjectTextLineStarts(object, text, box, font, lines),
	];
};

/**
 * The finding about one connector's label, empty when it has room to be drawn in.
 *
 * A warning rather than an error: what the label runs over is the shapes' fill,
 * which leaves both readable often enough that this is a thing to look at rather
 * than a thing that is broken.
 */
const diagnoseConnectorLabel = (
	connector: ObjectDoc,
	objectsById: ReadonlyMap<string, ObjectDoc>,
): Diagnostic[] => {
	const fit = calcConnectorLabelFit(connector, objectsById);
	if (fit === null || fit.textWidth <= fit.gap) {
		return [];
	}
	return [
		{
			severity: "warning",
			objectId: connector.id,
			message: `label "${fit.text}" is ${round(fit.textWidth)}px wide but only ${round(fit.gap)}px is free between ${fit.sourceId} and ${fit.targetId}, so the label is drawn over them (font ${fit.fontSize}px)`,
		},
	];
};

/**
 * The finding about where a connector's label breaks, empty when it breaks
 * nowhere awkward. Nothing wraps a label, so the breaks looked at are the ones
 * the author typed — but a line still opens with whatever follows them.
 */
const diagnoseConnectorLabelLineStarts = (
	connector: ObjectDoc,
): Diagnostic[] => {
	const label = resolveConnectorLabel(connector);
	if (label === null) {
		return [];
	}
	const prohibitions = findLineStartProhibitions(
		label.text,
		layoutTextLines(label.text, label.font),
	);
	if (prohibitions.length === 0) {
		return [];
	}
	return [
		{
			severity: "warning",
			objectId: connector.id,
			// A label only reaches here by carrying a break, so the breaks are shown
			// rather than taken — a diagnostic message is one line.
			message: `label "${label.text.replace(/\n/g, "\\n")}" breaks a line before a character Japanese typesetting keeps off a line head: ${describeLineStartProhibitions(prohibitions)} (font ${label.font.fontSize}px)`,
		},
	];
};

/**
 * Checks every object's text against the space its shape actually leaves for it:
 * the text is wrapped at
 * {@link import("./resolveContentBox").resolveContentBox}'s width with
 * {@link import("./measureWrappedText").measureWrappedText} — the canvas's own
 * line breaking, against the canvas's own font files — and the lines it comes to
 * are compared with the content box's height.
 *
 * A connector's label is checked too, against the room between the two shapes it
 * runs between rather than against a box of its own: the label is drawn over the
 * line at its own width, so one wider than the space between the shapes lands on
 * top of them ({@link import("./connectorLabelFit").calcConnectorLabelFit}, which
 * also names the arrangements too free-form to judge).
 *
 * Where the lines fall is looked at as well as how many there are: a line opening
 * with a character Japanese typesetting keeps off a line head — a full stop, a
 * closing bracket ({@link import("./lineStartProhibition").LINE_START_PROHIBITED_CHARACTERS})
 * — is a warning, one per text however many of its lines offend. The canvas
 * breaks lines the way the browser does and the browser applies no such rule, so
 * this is an appearance the author changes in the wording or the width rather
 * than a fault the drawing could fix.
 *
 * A body placed on the shape's whole height (`textVerticalBasis: "frame"`) is
 * additionally checked against the region its type declares: a block reaching
 * past it is a warning, the declared region being where the type's author
 * promises the shape's own decoration is not
 * ({@link diagnoseDecorationOverlap}).
 *
 * Only text that cannot be read where it is drawn is reported as an error.
 * Spacing, aspect ratio and the other matters of style are deliberately left out:
 * the errors answer "would a reader see the text cut off", which is a fact about
 * the document rather than a matter of taste.
 *
 * Objects the check passes over: types whose text the box does not hold (a label
 * drawn outside the outline, a `record`'s text-sized bands, a shape with no
 * text), objects with no text, text nothing wraps (a `text` in its label layout,
 * whose box is measured from the text itself) and types outside the shipped set.
 * The overflow check additionally passes over an object with no stored `height`,
 * which is sized from its text on every read — but where its lines fall is still
 * looked at, the width being the author's. A shipped type that holds text but
 * declares no region is reported as a warning rather than passed over silently —
 * nothing measures it, and that is a gap in the shape set rather than a fact
 * about the document.
 *
 * @param doc - A parsed document, as `validateDoc` returns; group children are checked along with the objects at the root
 * @returns One error per overflowing object, in document order, plus a warning per text whose lines start where typesetting forbids, per frame-placed body reaching outside its type's declared region, per connector whose label does not fit between its shapes, and per object of a text-bearing type that declares no region; empty when everything fits
 */
export const diagnoseDoc = (doc: CanvasDoc): Diagnostic[] => {
	const objects = flattenObjects(doc.root);
	const objectsById = indexObjectsById(objects);
	return objects.flatMap((object) => [
		...diagnoseObjectText(object),
		...diagnoseConnectorLabel(object, objectsById),
		...diagnoseConnectorLabelLineStarts(object),
	]);
};
