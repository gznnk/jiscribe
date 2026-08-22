import type {
	CanvasDoc,
	ObjectDoc,
	ObjectDocDefinition,
	RichText,
} from "@jiscribe/doc";
import { richTextToPlain } from "@jiscribe/doc";
import type { TextMeasureFont } from "@jiscribe/doc/unstable";
import {
	DEFAULT_FONT_FAMILY,
	TEXT_LINE_HEIGHT,
	TEXT_STYLE_FALLBACK,
} from "@jiscribe/doc/unstable";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";

import { calcConnectorLabelFit, indexObjectsById } from "./connectorLabelFit";
import type { Diagnostic } from "./Diagnostic";
import { measureWrappedText } from "./measureWrappedText";
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

const round = (value: number): number => Math.round(value * 10) / 10;

/** Every finding about one object's text, empty when it fits. */
const diagnoseObjectText = (object: ObjectDoc): Diagnostic[] => {
	const definition = standardObjectDocDefinitions.get(object.type);
	if (definition?.features.text !== "body") {
		return [];
	}
	const body = object as TextBodyDoc;
	const { width, height } = body;
	// No stored height means the box is sized from the text on every read
	// (calcAutoShapeHeight), so there is no height for the text to overflow.
	if (typeof width !== "number" || typeof height !== "number") {
		return [];
	}
	if (body.text === undefined || richTextToPlain(body.text) === "") {
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
	const resolution = resolveContentBox({ ...body, width, height });
	if (resolution.kind !== "region") {
		return [];
	}
	const box = resolution.rect;

	const font = resolveBodyFont(body, definition);
	const metrics = measureWrappedText(body.text, font, box.width);
	const diagnostics: Diagnostic[] = [];

	if (metrics.height > box.height + calcOverflowTolerance(font.fontSize)) {
		diagnostics.push({
			severity: "error",
			objectId: object.id,
			message: `text overflows ${object.type} ${width}x${height}: ${metrics.lines} line(s) need ${round(metrics.height)}px but the content box is ${round(box.height)}px tall (content box ${round(box.width)}x${round(box.height)}, font ${font.fontSize}px)`,
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
			message: `text is too wide for ${object.type} ${width}x${height}: the narrowest line is ${round(metrics.width)}px but the content box is ${round(box.width)}px wide (font ${font.fontSize}px)`,
		});
	}
	return diagnostics;
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
 * Only text that cannot be read where it is drawn is reported. Spacing, aspect
 * ratio and the other matters of style are deliberately left out: this answers
 * "would a reader see the text cut off", which is a fact about the document
 * rather than a matter of taste.
 *
 * Objects the check passes over: types whose text the box does not hold (a label
 * drawn outside the outline, a `record`'s text-sized bands, a shape with no
 * text), objects with no text or no explicit size — a shape that states no
 * `height` is sized from its text on every read, so nothing can overflow it —
 * and types outside the shipped
 * set. A shipped type that holds text but declares no region is reported as a
 * warning rather than passed over silently — nothing measures it, and that is a
 * gap in the shape set rather than a fact about the document.
 *
 * @param doc - A parsed document, as `validateDoc` returns; group children are checked along with the objects at the root
 * @returns One error per overflowing object, in document order, plus a warning per connector whose label does not fit between its shapes and per object of a text-bearing type that declares no region; empty when everything fits
 */
export const diagnoseDoc = (doc: CanvasDoc): Diagnostic[] => {
	const objects = flattenObjects(doc.root);
	const objectsById = indexObjectsById(objects);
	return objects.flatMap((object) => [
		...diagnoseObjectText(object),
		...diagnoseConnectorLabel(object, objectsById),
	]);
};
