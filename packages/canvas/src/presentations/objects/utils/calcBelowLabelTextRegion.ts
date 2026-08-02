import type { Dimensions } from "@workspace/geometry";

import { calcVisualLineCount, measureTextWidth } from "./measureText";
import { TEXT_LINE_HEIGHT } from "../../../constants/textLineHeight";
import type { TextSlot } from "../../../schemas/objects/types/TextSlot";
import { BELOW_LABEL_STYLE_DEFAULTS } from "../../../schemas/objects/utils/belowLabelStyleDefaults";
import type { ObjectTextRegionCalculator } from "../registry/ObjectTextRegionRegistry";

/** Empty band between the bottom edge of the box and the top of the label. */
export const BELOW_LABEL_GAP = 4;

/**
 * Inner padding of the label box. Must stay equal to the `padding: 2px 6px` of
 * TextOverlayFrameStyled's TextContent, or the measured box and the drawn one
 * wrap at different widths.
 */
const BELOW_LABEL_PADDING_X = 6;
const BELOW_LABEL_PADDING_Y = 2;

/** Label box width limits (content width + padding, in local px). */
const BELOW_LABEL_MIN_WIDTH = 16;
const BELOW_LABEL_MAX_WIDTH = 240;

/**
 * What the label layout reads off the state: the untransformed box size plus the
 * text slots, whose content sizes the label. Typed as the open slot map every
 * text-bearing state carries rather than one shape's own single slot, so the
 * registry's calculator type still accepts it (ObjectTextRegionCalculator 参照).
 */
type BelowLabelState = Dimensions & {
	/** The shape's text slots, keyed by slot id; an absent slot reads as empty. */
	text?: Record<string, TextSlot>;
};

/**
 * Places the label of a shape whose box is fully taken by its drawing: a box
 * sized from its own text, centered under the bounding box. Sizing the label from
 * the text instead of from the box is what keeps it legible when the drawing is
 * scaled down — the two are independent, exactly as a connector's label is
 * independent of its path.
 *
 * Register as such a shape's `textRegion`, so the drawn label (TextOverlay) and
 * the in-place editor resolve the same rectangle; while editing, the grafted
 * draft text (graftTextEditDraft) reaches here, so the box follows every
 * keystroke. Pair it with `calcBelowLabelVisualBounds`, or zoom-to-fit and the
 * export viewBox crop the label away.
 *
 * @param state The shape's box (width/height) and its text slots.
 * @param slotId Which slot to place; a shape with no such slot lays out an empty label.
 * @returns The label rectangle in local coordinates (shape center as origin), always below the box.
 */
export const calcBelowLabelTextRegion: ObjectTextRegionCalculator<
	BelowLabelState
> = (state, slotId) => {
	const slot = state.text?.[slotId];
	const content = slot?.text;
	const text = Array.isArray(content) ? content.join("\n") : (content ?? "");

	const font = {
		fontSize: slot?.fontSize ?? BELOW_LABEL_STYLE_DEFAULTS.fontSize,
		fontFamily: slot?.fontFamily ?? BELOW_LABEL_STYLE_DEFAULTS.fontFamily,
		fontWeight: slot?.fontWeight ?? BELOW_LABEL_STYLE_DEFAULTS.fontWeight,
	};

	const lines = text === "" ? [""] : text.split("\n");
	const longestLineWidth = lines.reduce(
		(widest, line) => Math.max(widest, measureTextWidth(line, font)),
		0,
	);

	const width = Math.min(
		BELOW_LABEL_MAX_WIDTH,
		Math.max(
			BELOW_LABEL_MIN_WIDTH,
			longestLineWidth + BELOW_LABEL_PADDING_X * 2,
		),
	);

	// Count the displayed lines the way the box lays them out, so a line that
	// wraps at the max width reserves the same height while editing and after.
	const visualLineCount = calcVisualLineCount(
		text,
		font,
		width - BELOW_LABEL_PADDING_X * 2,
	);
	const height =
		visualLineCount * font.fontSize * TEXT_LINE_HEIGHT +
		BELOW_LABEL_PADDING_Y * 2;

	return {
		x: -width / 2,
		y: state.height / 2 + BELOW_LABEL_GAP,
		width,
		height,
	};
};
