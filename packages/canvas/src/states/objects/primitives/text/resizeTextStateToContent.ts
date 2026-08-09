import { roundToDecimal } from "@workspace/geometry";

import type { TextState } from "./TextState";
import { PRECISION } from "../../../../constants/precision";
import { BODY_TEXT_SLOT_ID } from "../../../../constants/textSlotId";
import { calcTextObjectFrameSize } from "../../../../schemas/objects/primitives/text/calcTextObjectFrameSize";
import { readTextSlot } from "../../types/TextSlots";

/**
 * Re-measures a text object's box from the text it currently holds, keeping the
 * box's top-left corner where it was. That corner is what the doc stores, so
 * anchoring it there is what makes text grow to the right and down instead of
 * drifting.
 *
 * @param state - The text object to re-measure; its slot content and typography are the only inputs read
 * @param fallbackFontFamily - Family used when the object sets none. Pass the family it is actually drawn in (the host theme's), or the box comes out a few percent narrow
 * @returns `state` itself when the measurement matches the box it already has, so callers can use reference equality to skip further work
 */
export const resizeTextStateToContent = (
	state: TextState,
	fallbackFontFamily: string,
): TextState => {
	const slot = state.text?.[BODY_TEXT_SLOT_ID];
	const { width, height } = calcTextObjectFrameSize(
		readTextSlot(state.text, BODY_TEXT_SLOT_ID),
		slot ?? {},
		fallbackFontFamily,
	);
	if (width === state.width && height === state.height) {
		return state;
	}

	// The corner is rounded before the new center is built around it, so repeated
	// re-measurements land on the same value instead of drifting a float epsilon
	// per keystroke — and the doc keeps a coordinate a person can read.
	const x = roundToDecimal(state.cx - state.width / 2, PRECISION.COORDINATE);
	const y = roundToDecimal(state.cy - state.height / 2, PRECISION.COORDINATE);
	return {
		...state,
		cx: x + width / 2,
		cy: y + height / 2,
		width,
		height,
	};
};
