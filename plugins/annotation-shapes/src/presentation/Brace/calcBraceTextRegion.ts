import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { TextSlot } from "@workspace/canvas/doc";
import {
	calcVisualLineCount,
	measureTextWidth,
} from "@workspace/canvas/unstable";
import {
	BELOW_LABEL_STYLE_DEFAULTS,
	TEXT_LINE_HEIGHT,
} from "@workspace/canvas/unstable-doc";
import type { Dimensions, Rect } from "@workspace/geometry";

import {
	calcBraceTip,
	resolveBraceDirection,
	resolveBraceTipPosition,
} from "./braceGeometry";
import type { BraceDirection } from "../../schema/brace/BraceDoc";
import { BRACE_LABEL_GAP } from "../../schema/brace/BraceDoc";

/**
 * Inner padding of the label box. Must stay equal to the `padding: 2px 6px` of
 * the core text overlay, or the measured box and the drawn one wrap at
 * different widths.
 */
const BRACE_LABEL_PADDING_X = 6;
const BRACE_LABEL_PADDING_Y = 2;

/** Label box width limits (content width + padding, in local px). */
const BRACE_LABEL_MIN_WIDTH = 16;
const BRACE_LABEL_MAX_WIDTH = 240;

/**
 * What the label layout reads off the state: the box the bracket fills, where
 * its tip is, and the text slots the label is sized from. Typed as the open slot
 * map every text-bearing state carries rather than one shape's own single slot,
 * so the registry's calculator type still accepts it.
 */
type BraceLabelState = Dimensions & {
	/** Which way the tip points; the label hangs off that side. */
	direction?: BraceDirection;
	/** Where the tip sits along the span, 0..1. */
	tipPosition?: number;
	/** The shape's text slots, keyed by slot id; an absent slot reads as empty. */
	text?: Record<string, TextSlot>;
};

/** The label box's own size, before it is placed against the tip. */
const measureLabelBox = (slot: TextSlot | undefined): Dimensions => {
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
		BRACE_LABEL_MAX_WIDTH,
		Math.max(
			BRACE_LABEL_MIN_WIDTH,
			longestLineWidth + BRACE_LABEL_PADDING_X * 2,
		),
	);

	// Count the displayed lines the way the box lays them out, so a line that
	// wraps at the max width reserves the same height while editing and after.
	const visualLineCount = calcVisualLineCount(
		text,
		font,
		width - BRACE_LABEL_PADDING_X * 2,
	);
	return {
		width,
		height:
			visualLineCount * font.fontSize * TEXT_LINE_HEIGHT +
			BRACE_LABEL_PADDING_Y * 2,
	};
};

/**
 * Places a brace's label: a box sized from its own text, set just beyond the
 * tip and centered on it. Sizing the label from the text rather than from the
 * box is what lets the bracket stay a thin band — the two never compete for
 * room, and the tip always points at the middle of the name it gives the group.
 *
 * Register as the type's `textRegion`, so the drawn label and the in-place
 * editor resolve the same rectangle; while editing, the grafted draft text
 * reaches here, so the box follows every keystroke. Pair it with
 * `calcBraceVisualBounds`, or zoom-to-fit and the export viewBox crop the label
 * away.
 *
 * @param state The shape's box, tip placement, and text slots.
 * @param slotId Which slot to place; a shape with no such slot lays out an empty label.
 * @returns The label rectangle in local coordinates (shape center as origin), always outside the box.
 */
export const calcBraceTextRegion: ObjectTextRegionCalculator<
	BraceLabelState
> = (state, slotId): Rect => {
	const direction = resolveBraceDirection(state);
	const { width, height } = measureLabelBox(state.text?.[slotId]);
	const tip = calcBraceTip(
		-state.width / 2,
		-state.height / 2,
		state.width,
		state.height,
		direction,
		resolveBraceTipPosition(state),
	);

	switch (direction) {
		case "left":
			return {
				x: tip.x - BRACE_LABEL_GAP - width,
				y: tip.y - height / 2,
				width,
				height,
			};
		case "right":
			return {
				x: tip.x + BRACE_LABEL_GAP,
				y: tip.y - height / 2,
				width,
				height,
			};
		case "up":
			return {
				x: tip.x - width / 2,
				y: tip.y - BRACE_LABEL_GAP - height,
				width,
				height,
			};
		case "down":
			return {
				x: tip.x - width / 2,
				y: tip.y + BRACE_LABEL_GAP,
				width,
				height,
			};
	}
};
