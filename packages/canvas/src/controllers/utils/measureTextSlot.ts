import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectTextStyleDefaultsRegistry";
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
import type { ObjectTextRegionRegistry } from "../../rendering/objects/registry/ObjectTextRegionRegistry";
import { calcTextRegion } from "../../rendering/objects/utils/calcTextRegion";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import { resolveTextObjectFont } from "../../states/objects/primitives/text/resolveTextObjectFont";
import { readRichTextSlot } from "../../states/objects/types/TextSlots";
import type { ObjectTextLayoutRegistry } from "../../states/registry/ObjectTextLayoutRegistry";

/**
 * Slack allowed before the text counts as outgrowing its region, in local px.
 * Measurement and layout round differently in their last fraction of a pixel,
 * and a box drawn exactly as tall as its text must not report as clipped.
 */
const OVERFLOW_TOLERANCE = 0.5;

/** The drawn text box of one slot, marked by TextOverlayFrame. */
const TEXT_OVERLAY_SELECTOR = 'foreignObject[data-layer="text-overlay"]';

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
	/**
	 * How many lines are drawn; a soft-wrapped line counts as one of its own.
	 * Null for a type that lays its body out itself (Markdown), whose blocks are
	 * not lines and whose `textSize` is read off the drawing instead.
	 */
	lineCount: number | null;
	/**
	 * Whether the text is drawn clipped: the region hides whatever does not fit
	 * on either axis (`overflow: hidden`).
	 */
	isOverflowing: boolean;
};

/** Whether the text outgrows its region on either axis, tolerance included. */
const isOutgrowingRegion = (
	textSize: Dimensions,
	regionSize: Dimensions,
): boolean =>
	textSize.height > regionSize.height + OVERFLOW_TOLERANCE ||
	textSize.width > regionSize.width + OVERFLOW_TOLERANCE;

/**
 * Size the drawn content box of one slot takes, read off the live drawing.
 *
 * `scrollWidth` / `scrollHeight` are the content's own extent with the box's
 * padding included, which is what the simulated path adds by hand, and they are
 * in the foreignObject's user units — the shape's local px, whatever the zoom.
 *
 * @param svgElement - The canvas's live `<svg>`; an object viewport culling has
 *   dropped is absent from it, so suspend culling around the read
 * @param objectId - Id of the object holding the slot, as its overlay carries it
 *   in `data-object-id`
 * @param slotId - Slot the overlay carries beside the id
 * @returns The size in the shape's local px, or null when that slot draws
 *   nothing right now (its text is open in the editor, or it holds none)
 */
const readDrawnTextSize = (
	svgElement: SVGSVGElement,
	objectId: string,
	slotId: string,
): Dimensions | null => {
	// Matched attribute by attribute rather than through one selector: object ids
	// come from the document, so putting them in a selector would need escaping.
	// Array.from: the VSCode extension type-checks this file without DOM.Iterable.
	for (const overlay of Array.from(
		svgElement.querySelectorAll(TEXT_OVERLAY_SELECTOR),
	)) {
		if (
			overlay.getAttribute("data-object-id") !== objectId ||
			overlay.getAttribute("data-slot") !== slotId
		) {
			continue;
		}
		// The TextOverlayFrame DOM contract: foreignObject > wrapper > content.
		const contentElement = overlay.firstElementChild?.firstElementChild;
		if (!contentElement) {
			return null;
		}
		return {
			width: contentElement.scrollWidth,
			height: contentElement.scrollHeight,
		};
	}
	return null;
};

/**
 * Measures how one text slot is laid out in the box the shape draws for it —
 * the question a document cannot answer, since it stores the text and the shape
 * size but not the wrapping between them.
 *
 * Plain text is simulated with the function the canvas draws and edits by
 * (`layoutVisualLines`), through the same region and style resolution the
 * overlay uses, so the answer matches the drawing wherever the drawn font is the
 * measured one. A type that lays its body out itself (`textLayout: "own"`, the
 * Markdown card) cannot be simulated that way — its headings, fences and block
 * margins are none of them lines — so its drawn box is read off the live `<svg>`
 * instead, and it reports no `lineCount`.
 *
 * @param object - The object whose slot is measured; one that is not frame-based
 *   (a connector, a poly shape) has no text region and yields null
 * @param slotId - Key of the object's `text`; an absent key yields null
 * @param registries - The canvas's region calculators, per-type text-style
 *   defaults and per-type text-layout flags, i.e. the lookups the drawn overlay
 *   resolves its box through
 * @param svgElement - The canvas's live `<svg>`, or null before the view mounts.
 *   Only a type laying its body out itself reads it, and it measures nothing
 *   without it; an object the viewport has culled away is missing from it too,
 *   so suspend culling around the call (useViewportCulling)
 * @returns The measurement, or null when the object holds no such slot, and for
 *   a self-laid-out body also when it is not on the drawing right now
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
		objectTextLayout: Pick<ObjectTextLayoutRegistry, "hasOwnLayout">;
	},
	svgElement: SVGSVGElement | null,
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
	const bounds = convertBoundingBoxToRect(
		calcTransformedRectBounds(region, object),
	);

	if (registries.objectTextLayout.hasOwnLayout(object.type)) {
		const drawnSize =
			svgElement === null
				? null
				: readDrawnTextSize(svgElement, object.id, slotId);
		if (drawnSize === null) {
			return null;
		}
		return {
			slotId,
			bounds,
			textSize: drawnSize,
			regionSize,
			lineCount: null,
			isOverflowing: isOutgrowingRegion(drawnSize, regionSize),
		};
	}

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
		bounds,
		textSize,
		regionSize,
		lineCount: lines.length,
		isOverflowing: isOutgrowingRegion(textSize, regionSize),
	};
};
