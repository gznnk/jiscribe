import type { TextSlotStyle } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";
import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "@jiscribe/doc/text/block/textBoxPadding";
import { layoutVisualLines } from "@jiscribe/doc/text/layout/layoutVisualLines";
import {
	convertBoundingBoxToRect,
	isTransformedFrame,
} from "@jiscribe/geometry";
import type { Dimensions, Rect } from "@jiscribe/geometry";

import { calcTransformedRectBounds } from "./calcTransformedRectBounds";
import type { ObjectPartKindRegistry } from "../../rendering/objects/registry/ObjectPartKindRegistry";
import type {
	ObjectTextMeasurement,
	ObjectTextMeasurerRegistry,
} from "../../rendering/objects/registry/ObjectTextMeasurerRegistry";
import { calcTextRegion } from "../../rendering/objects/utils/calcTextRegion";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import {
	isTextStyleState,
	type TextStyleState,
} from "../../states/objects/base/TextStyleState";
import { resolveTextObjectFont } from "../../states/objects/primitives/text/resolveTextObjectFont";
import { readRichTextSlot } from "../../states/objects/types/TextSlots";
import { TEXT_SLOT_PART_KIND } from "../selection/partKinds/textSlotPartKind";

/**
 * Slack allowed before the text counts as outgrowing its region, in local px.
 * Measurement and layout round differently in their last fraction of a pixel,
 * and a box drawn exactly as tall as its text must not report as clipped.
 */
const OVERFLOW_TOLERANCE = 0.5;

/** How one text slot is laid out inside the box the shape draws for it. */
export type TextSlotMeasurement = {
	/** Which slot was measured; a key of the shape's `text`. */
	textSlotId: string;
	/**
	 * World-space bounds of the region the slot is drawn in. Rotation is
	 * flattened into an upright box (see calcTransformedRectBounds).
	 */
	bounds: Rect;
	/**
	 * Size the laid-out text takes, its box padding included, in the shape's
	 * local px. Compare against `regionSize` to see how much a shape must grow
	 * for the text to fit. Plain text reports its widest line; a body laid out
	 * as HTML blocks (Markdown) reports the width measureTextOverlayContent
	 * describes.
	 */
	textSize: Dimensions;
	/**
	 * Size of the region the text is laid out in, in the same local px. A
	 * flipped shape reports it positive — the flip does not change how much room
	 * the text has.
	 */
	regionSize: Dimensions;
	/**
	 * How many lines are drawn; a soft-wrapped line counts as one of its own.
	 * Null for a body laid out as HTML blocks (Markdown), which has headings,
	 * margins and tables rather than lines of one height.
	 */
	lineCount: number | null;
	/**
	 * Whether the text is drawn clipped: the region hides whatever does not fit
	 * on either axis (`overflow: hidden`).
	 */
	isOverflowing: boolean;
};

/** Lays the slot out as plain text, the way the shared TextOverlay draws it. */
const layOutPlainText = (
	object: TextStyleState,
	slotId: string,
	style: TextSlotStyle,
	regionSize: Dimensions,
): ObjectTextMeasurement => {
	const lines = layoutVisualLines(
		readRichTextSlot(object.text, slotId),
		resolveTextObjectFont(style),
		regionSize.width - TEXT_BOX_PADDING_X * 2,
	);
	return {
		textSize: {
			width:
				lines.reduce((widest, line) => Math.max(widest, line.width), 0) +
				TEXT_BOX_PADDING_X * 2,
			height:
				lines.reduce((total, line) => total + line.height, 0) +
				TEXT_BOX_PADDING_Y * 2,
		},
		lineCount: lines.length,
	};
};

/**
 * Measures how one text slot is laid out in the box the shape draws for it —
 * the question a document cannot answer, since it stores the text and the shape
 * size but not the wrapping between them.
 *
 * The layout is simulated with the function the canvas draws and edits by
 * (`layoutVisualLines`), through the same region and style resolution the
 * overlay uses, so the answer matches the drawing wherever the drawn font is the
 * measured one. A type that draws its body itself (Markdown, laid out as HTML
 * blocks) is measured by its own `textMeasurer` instead, which lays the body out
 * off screen the way its overlay draws it (see ObjectTextMeasurerRegistry).
 * Either way the region and the overflow verdict are decided here.
 *
 * @param object - The object whose slot is measured; one that is not frame-based
 *   (a connector, a poly shape) has no text region and yields null
 * @param slotId - Key of the object's `text`; an absent key yields null
 * @param registries - The canvas's part kinds, whose `"textSlot"` kind places
 *   the slot, and per-type text-style defaults, i.e. the two lookups the drawn
 *   overlay resolves its box through, plus the per-type text measurers that
 *   replace the plain-text layout for a type registering one
 * @returns The measurement, or null when the object holds no such slot
 */
export const measureTextSlot = (
	object: ObjectState,
	slotId: string,
	registries: {
		objectPartKind: Pick<ObjectPartKindRegistry, "get">;
		objectTextStyleDefaults: Pick<
			ObjectTextStyleDefaultsRegistry,
			"resolveTextSlotStyle"
		>;
		objectTextMeasurer: Pick<ObjectTextMeasurerRegistry, "get">;
	},
): TextSlotMeasurement | null => {
	if (!isTransformedFrame(object) || !isTextStyleState(object)) {
		return null;
	}
	const slot = object.text?.[slotId];
	if (slot === undefined) {
		return null;
	}

	const region = calcTextRegion(
		object,
		slotId,
		registries.objectPartKind.get(object.type, TEXT_SLOT_PART_KIND),
	);
	// A flipped shape carries the flip in scaleX/scaleY, but a calculator may
	// also hand back a negative extent; either way the text has the same room.
	const regionSize = {
		width: Math.abs(region.width),
		height: Math.abs(region.height),
	};
	const style = registries.objectTextStyleDefaults.resolveTextSlotStyle(
		object.type,
		slotId,
		slot,
	);

	const textMeasurer = registries.objectTextMeasurer.get(object.type);
	const { textSize, lineCount }: ObjectTextMeasurement =
		textMeasurer === undefined
			? layOutPlainText(object, slotId, style, regionSize)
			: textMeasurer(object, slotId, { regionSize, style });

	return {
		textSlotId: slotId,
		bounds: convertBoundingBoxToRect(calcTransformedRectBounds(region, object)),
		textSize,
		regionSize,
		lineCount,
		isOverflowing:
			textSize.height > regionSize.height + OVERFLOW_TOLERANCE ||
			textSize.width > regionSize.width + OVERFLOW_TOLERANCE,
	};
};
