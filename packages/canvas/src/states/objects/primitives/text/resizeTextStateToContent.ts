import type { TextSlotStyle } from "@jiscribe/doc/model/objects/types/TextSlot";
import { resolveTextSlotStyle } from "@jiscribe/doc/model/objects/types/TextSlot";
import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/text/style/textSlotId";
import { roundToDecimal } from "@jiscribe/geometry";

import { calcTextObjectFrameSize } from "./calcTextObjectFrameSize";
import {
	calcTextCenterFromDrawnTopLeft,
	calcTextDrawnTopLeft,
} from "./textDrawnTopLeft";
import type { TextState } from "./TextState";
import { readRichTextSlot } from "../../types/TextSlots";

/**
 * Re-measures a text object's box from the text it currently holds — its height
 * alone when the box has a stored width (`textLayout: "block"`) — keeping the
 * drawn top-left corner — the local `(-width / 2, -height / 2)` corner put
 * through the object's own rotation and flips — where it was. That is where the
 * first glyph sits, so anchoring it there is what makes text grow away from the
 * start of the line instead of dragging what is already typed sideways.
 *
 * That corner is what the doc stores as `(x, y)` (see TextDoc), so a re-measure
 * leaves the doc coordinate untouched however the object is rotated or flipped.
 *
 * @param state - The text object to re-measure; its slot content, typography and transform are the only inputs read
 * @param textStyleDefaults - The `text` type's own text-style defaults, resolved into the slot before measuring so the box is measured with the style the overlay draws (ObjectTextStyleDefaultsRegistry). Omitted measures with the slot alone
 * @returns `state` itself when the measurement matches the box it already has, so callers can use reference equality to skip further work
 */
export const resizeTextStateToContent = (
	state: TextState,
	textStyleDefaults?: TextSlotStyle,
): TextState => {
	const slot = state.text?.[BODY_TEXT_SLOT_ID];
	// A block text keeps the width it was given and re-measures the height alone,
	// so typing into one grows it downward and never sideways.
	const size = calcTextObjectFrameSize(
		readRichTextSlot(state.text, BODY_TEXT_SLOT_ID),
		resolveTextSlotStyle(textStyleDefaults, slot),
		state.textLayout === "block" ? state.width : undefined,
	);
	if (size.width === state.width && size.height === state.height) {
		return state;
	}

	const drawnTopLeft = calcTextDrawnTopLeft(state);
	// The corner is rounded before the new center is built around it, so repeated
	// re-measurements land on the same value instead of drifting a float epsilon
	// per keystroke — the same rounding the doc mapper applies to it.
	const anchor = {
		x: roundToDecimal(drawnTopLeft.x, PRECISION.COORDINATE),
		y: roundToDecimal(drawnTopLeft.y, PRECISION.COORDINATE),
	};
	const center = calcTextCenterFromDrawnTopLeft(anchor, size, state);
	return {
		...state,
		cx: center.x,
		cy: center.y,
		width: size.width,
		height: size.height,
	};
};
