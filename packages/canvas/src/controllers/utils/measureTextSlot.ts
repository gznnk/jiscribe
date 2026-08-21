import {
	convertBoundingBoxToRect,
	isTransformedFrame,
} from "@jiscribe/geometry";
import type { Dimensions, Rect } from "@jiscribe/geometry";

import { calcTransformedRectBounds } from "./calcTransformedRectBounds";
import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "../../constants/textBoxPadding";
import type { ObjectTextRegionRegistry } from "../../rendering/objects/registry/ObjectTextRegionRegistry";
import { calcTextRegion } from "../../rendering/objects/utils/calcTextRegion";
import type { ObjectTextStyleDefaultsRegistry } from "../../schemas/registry/ObjectTextStyleDefaultsRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import { resolveTextObjectFont } from "../../states/objects/primitives/text/resolveTextObjectFont";
import { readRichTextSlot } from "../../states/objects/types/TextSlots";
import { layoutVisualLines } from "../../text/measureText";

/**
 * Slack allowed before the text counts as outgrowing its region, in local px.
 * Measurement and layout round differently in their last fraction of a pixel,
 * and a box drawn exactly as tall as its text must not report as clipped.
 */
const OVERFLOW_TOLERANCE = 0.5;

/** How one text slot is laid out inside the box the shape draws for it. */
export type TextSlotMeasurement = {
	/** Which slot was measured; a key of the shape's `text`. */
	slotId: string;
	/**
	 * World-space bounds of the region the slot is drawn in. Rotation is
	 * flattened into an upright box (see calcTransformedRectBounds).
	 */
	bounds: Rect;
	/**
	 * Size the laid-out text takes, its box padding included, in the shape's
	 * local px. Compare against `regionSize` to see how much a shape must grow
	 * for the text to fit.
	 */
	textSize: Dimensions;
	/**
	 * Size of the region the text is laid out in, in the same local px. A
	 * flipped shape reports it positive — the flip does not change how much room
	 * the text has.
	 */
	regionSize: Dimensions;
	/** How many lines are drawn; a soft-wrapped line counts as one of its own. */
	lineCount: number;
	/**
	 * Whether the text is drawn clipped: the region hides whatever does not fit
	 * on either axis (`overflow: hidden`).
	 */
	isOverflowing: boolean;
};

/**
 * Measures how one text slot is laid out in the box the shape draws for it —
 * the question a document cannot answer, since it stores the text and the shape
 * size but not the wrapping between them.
 *
 * The layout is simulated with the function the canvas draws and edits by
 * (`layoutVisualLines`), through the same region and style resolution the
 * overlay uses, so the answer matches the drawing wherever the drawn font is the
 * measured one. A type whose body is not plain text (Markdown) lays itself out
 * as HTML blocks instead and is measured only as the plain text it holds.
 *
 * @param object - The object whose slot is measured; one that is not frame-based
 *   (a connector, a poly shape) has no text region and yields null
 * @param slotId - Key of the object's `text`; an absent key yields null
 * @param registries - The canvas's region calculators and per-type text-style
 *   defaults, i.e. the two lookups the drawn overlay resolves its box through
 * @returns The measurement, or null when the object holds no such slot
 */
export const measureTextSlot = (
	object: ObjectState,
	slotId: string,
	registries: {
		objectTextRegion: Pick<ObjectTextRegionRegistry, "get">;
		objectTextStyleDefaults: Pick<
			ObjectTextStyleDefaultsRegistry,
			"resolveSlotStyle"
		>;
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
		registries.objectTextRegion.get(object.type),
	);
	// A flipped shape carries the flip in scaleX/scaleY, but a calculator may
	// also hand back a negative extent; either way the text has the same room.
	const regionSize = {
		width: Math.abs(region.width),
		height: Math.abs(region.height),
	};
	const font = resolveTextObjectFont(
		registries.objectTextStyleDefaults.resolveSlotStyle(
			object.type,
			slotId,
			slot,
		),
	);

	const lines = layoutVisualLines(
		readRichTextSlot(object.text, slotId),
		font,
		regionSize.width - TEXT_BOX_PADDING_X * 2,
	);
	const textSize = {
		width:
			lines.reduce((widest, line) => Math.max(widest, line.width), 0) +
			TEXT_BOX_PADDING_X * 2,
		height:
			lines.reduce((total, line) => total + line.height, 0) +
			TEXT_BOX_PADDING_Y * 2,
	};

	return {
		slotId,
		bounds: convertBoundingBoxToRect(calcTransformedRectBounds(region, object)),
		textSize,
		regionSize,
		lineCount: lines.length,
		isOverflowing:
			textSize.height > regionSize.height + OVERFLOW_TOLERANCE ||
			textSize.width > regionSize.width + OVERFLOW_TOLERANCE,
	};
};
