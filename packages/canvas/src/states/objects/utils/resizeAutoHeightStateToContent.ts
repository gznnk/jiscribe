import type { TextSlotStyle } from "@jiscribe/doc/model/objects/types/TextSlot";
import { resolveTextSlotStyle } from "@jiscribe/doc/model/objects/types/TextSlot";
import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import type { ObjectDocTextRegionCalculator } from "@jiscribe/doc/plugin/ObjectDocTextRegion";
import { calcFullBoxTextRegion } from "@jiscribe/doc/plugin/ObjectDocTextRegion";
import { AUTO_HEIGHT_COMFORT_PADDING_EM } from "@jiscribe/doc/text/block/autoHeightComfortPadding";
import { calcAutoShapeHeight } from "@jiscribe/doc/text/block/calcAutoShapeHeight";
import { TEXT_LINE_HEIGHT } from "@jiscribe/doc/text/layout/textLineHeight";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/text/style/textSlotId";
import { isTransformedFrame, roundToDecimal } from "@jiscribe/geometry";

import type { ObjectState } from "../base/ObjectState";
import { isTextStyleState } from "../base/TextStyleState";
import { resolveTextObjectFont } from "../primitives/text/resolveTextObjectFont";
import { readRichTextSlot } from "../types/TextSlots";

/**
 * Re-derives the height of a shape whose document states none
 * (`ObjectState.autoHeight`): the shortest height its text region holds the
 * wrapped body at ({@link calcAutoShapeHeight}). The box's top edge — the
 * `y` the document stores — stays where it is, so a growing text pushes the
 * bottom edge down and leaves everything above it alone.
 *
 * Measured against the very region the shape draws its text in and the style
 * that region draws it with, which is what keeps the derived height the height
 * the browser then wraps the text into. A shape carrying the flag on a type that
 * declares no region is measured against its whole box, exactly as the overlay
 * draws it (`calcTextRegion`).
 *
 * The shape's `textVerticalBasis` goes into the measurement as well, so
 * switching a body onto the whole height grows the box that holds it rather than
 * pushing the same box's text over the type's own decoration.
 *
 * @param state - The shape to re-measure; one with no flag, no frame or no text is returned untouched
 * @param textRegion - The type's region calculator, the UI one the overlay resolves through; undefined measures against the whole box
 * @param textStyleDefaults - The type's own defaults for its body slot, resolved into the slot before measuring so the measured font is the drawn one; omitted measures with the slot alone
 * @returns `state` itself when the height it already has is the derived one, so callers can skip the rest of the pass by reference equality; a shape whose text no height holds keeps its measured height, or gets a one-line box where it has none yet (the mapper's 0 seed), so a reloaded document never draws it invisible
 */
export const resizeAutoHeightStateToContent = (
	state: ObjectState,
	textRegion: ObjectDocTextRegionCalculator | undefined,
	textStyleDefaults?: TextSlotStyle,
): ObjectState => {
	if (
		state.autoHeight !== true ||
		!isTransformedFrame(state) ||
		!isTextStyleState(state)
	) {
		return state;
	}
	const font = resolveTextObjectFont(
		resolveTextSlotStyle(textStyleDefaults, state.text?.[BODY_TEXT_SLOT_ID]),
	);
	const height = calcAutoShapeHeight(
		state,
		readRichTextSlot(state.text, BODY_TEXT_SLOT_ID),
		font,
		textRegion ?? calcFullBoxTextRegion,
		state.textVerticalBasis,
	);
	// A height nothing derives (the region never holds this text — see
	// calcAutoShapeHeight) leaves the box where the last measurement put it,
	// that being a better answer than shrinking the shape to nothing. The
	// mapper's fresh seed has had no measurement yet — its height is 0 — and a
	// document reloading into an invisible shape would read as data loss, so
	// that one case falls back to a one-line box instead of the seed.
	if (height === null) {
		if (state.height > 0) {
			return state;
		}
		return resizeKeepingTop(
			state,
			Math.ceil(
				font.fontSize * TEXT_LINE_HEIGHT +
					font.fontSize * AUTO_HEIGHT_COMFORT_PADDING_EM * 2,
			),
		);
	}
	if (height === state.height) {
		return state;
	}
	return resizeKeepingTop(state, height);
};

/**
 * The state at `height` with its top edge kept: the `y` the document stores is
 * the box's top, so a re-derived height moves the bottom edge alone. The top is
 * rounded the way the doc mapper rounds it, so repeated measurements land on
 * the same centre instead of drifting a float epsilon each time the text
 * changes.
 */
const resizeKeepingTop = (
	state: ObjectState & { cy: number; height: number },
	height: number,
): ObjectState => {
	const top = roundToDecimal(state.cy - state.height / 2, PRECISION.COORDINATE);
	const resized = { ...state, cy: top + height / 2, height };
	return resized;
};
