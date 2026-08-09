import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { TextSlot } from "@workspace/canvas/doc";
import { calcVisualLineCount, measureTextWidth } from "@workspace/canvas-sdk";
import {
	BELOW_LABEL_STYLE_DEFAULTS,
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
	TEXT_LINE_HEIGHT,
} from "@workspace/canvas-sdk/doc";
import type { Dimensions, Rect } from "@workspace/geometry";

import {
	calcGroupMarkerTip,
	resolveGroupMarkerDirection,
	resolveGroupMarkerTipPosition,
} from "./groupMarkerGeometry";
import type { GroupMarkerDirection } from "../../schema/shared/GroupMarkerFields";
import { GROUP_MARKER_LABEL_GAP } from "../../schema/shared/GroupMarkerFields";

/** Label box width limits (content width + padding, in local px). */
const GROUP_MARKER_LABEL_MIN_WIDTH = 16;
const GROUP_MARKER_LABEL_MAX_WIDTH = 240;

/**
 * What the label layout reads off the state: the box the marker fills, where its
 * tip is, and the text slots the label is sized from. Typed as the open slot map
 * every text-bearing state carries rather than one shape's own single slot, so
 * the registry's calculator type still accepts it.
 */
type GroupMarkerLabelState = Dimensions & {
	/** Which way the marker faces; the label hangs off that side. */
	direction?: GroupMarkerDirection;
	/** Where the tip sits along the span, 0..1; absent on a marker with no movable tip. */
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
		GROUP_MARKER_LABEL_MAX_WIDTH,
		Math.max(
			GROUP_MARKER_LABEL_MIN_WIDTH,
			longestLineWidth + TEXT_BOX_PADDING_X * 2,
		),
	);

	// Count the displayed lines the way the box lays them out, so a line that
	// wraps at the max width reserves the same height while editing and after.
	const visualLineCount = calcVisualLineCount(
		text,
		font,
		width - TEXT_BOX_PADDING_X * 2,
	);
	return {
		width,
		height:
			visualLineCount * font.fontSize * TEXT_LINE_HEIGHT +
			TEXT_BOX_PADDING_Y * 2,
	};
};

/**
 * Places a group marker's label: a box sized from its own text, set just beyond
 * the tip and centered on it. Sizing the label from the text rather than from
 * the box is what lets the marker stay a thin band — the two never compete for
 * room, and the tip always points at the middle of the name it gives the group.
 *
 * Register as the type's `textRegion`, so the drawn label and the in-place
 * editor resolve the same rectangle; while editing, the grafted draft text
 * reaches here, so the box follows every keystroke. Pair it with
 * `calcGroupMarkerVisualBounds`, or zoom-to-fit and the export viewBox crop the
 * label away.
 *
 * @param state The shape's box, tip placement, and text slots.
 * @param slotId Which slot to place; a shape with no such slot lays out an empty label.
 * @returns The label rectangle in local coordinates (shape center as origin), always outside the box.
 */
export const calcGroupMarkerTextRegion: ObjectTextRegionCalculator<
	GroupMarkerLabelState
> = (state, slotId): Rect => {
	const direction = resolveGroupMarkerDirection(state);
	const { width, height } = measureLabelBox(state.text?.[slotId]);
	const tip = calcGroupMarkerTip(
		-state.width / 2,
		-state.height / 2,
		state.width,
		state.height,
		direction,
		resolveGroupMarkerTipPosition(state),
	);

	switch (direction) {
		case "left":
			return {
				x: tip.x - GROUP_MARKER_LABEL_GAP - width,
				y: tip.y - height / 2,
				width,
				height,
			};
		case "right":
			return {
				x: tip.x + GROUP_MARKER_LABEL_GAP,
				y: tip.y - height / 2,
				width,
				height,
			};
		case "up":
			return {
				x: tip.x - width / 2,
				y: tip.y - GROUP_MARKER_LABEL_GAP - height,
				width,
				height,
			};
		case "down":
			return {
				x: tip.x - width / 2,
				y: tip.y + GROUP_MARKER_LABEL_GAP,
				width,
				height,
			};
	}
};
