import type { InlineTextStyle } from "@jiscribe/doc/model/objects/types/RichText";
import { readRichTextRangeStyle } from "@jiscribe/doc/model/objects/types/RichText";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectTextStyleDefaultsRegistry";

import {
	resolveTextEditSelection,
	styleTextEditSelection,
} from "./styleTextEditSelection";
import { toggleTextDecorationToken } from "./toggleTextDecorationToken";
import type { CanvasControllerState } from "../CanvasTypes";

/** The formats a keystroke can turn on and off over the selected text. */
export type TextEditFormat = "bold" | "italic" | "underline";

/**
 * The styling the format lands on: the opposite of what the whole selection is
 * drawn with now, in the same values the shape-wide menu writes (TextFormatMenu),
 * so a run and its slot never disagree about what "bold" is. A selection mixing
 * both reads as unset and therefore turns the format on.
 */
const toggledStyle = (
	format: TextEditFormat,
	current: InlineTextStyle,
): InlineTextStyle => {
	if (format === "bold") {
		return { fontWeight: current.fontWeight === "bold" ? "normal" : "bold" };
	}
	if (format === "italic") {
		return { fontStyle: current.fontStyle === "italic" ? "normal" : "italic" };
	}
	// The other decoration line is kept, and a mixed selection (no shared value)
	// turns underline on.
	return {
		textDecoration: toggleTextDecorationToken(
			current.textDecoration,
			"underline",
		),
	};
};

/**
 * Turns a format on or off over the text the open editor has selected, leaving
 * the rest of the slot as it is.
 *
 * @param state - The current canvas controller state
 * @param format - The format the keystroke carries
 * @param textStyleDefaults - Per-canvas ObjectTextStyleDefaultsRegistry; the run
 *   styling is read against the slot resolved through it, so a slot that sets
 *   nothing still toggles against what its type draws it with (a body already
 *   bold by type default turns normal on the first press, not bold again)
 * @returns A new state, or `state` itself when nothing applies (see
 *   {@link resolveTextEditSelection})
 */
export const toggleTextEditFormat = (
	state: CanvasControllerState,
	format: TextEditFormat,
	textStyleDefaults: ObjectTextStyleDefaultsRegistry,
): CanvasControllerState => {
	const selection = resolveTextEditSelection(state);
	if (selection === null) {
		return state;
	}
	return styleTextEditSelection(
		state,
		toggledStyle(
			format,
			readRichTextRangeStyle(
				selection.content,
				selection.start,
				selection.end,
				textStyleDefaults.resolveSlotStyle(
					selection.type,
					selection.slotId,
					selection.slot,
				),
			),
		),
	);
};
