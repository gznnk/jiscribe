import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { TextSlot } from "@workspace/canvas/doc";
import {
	calcVisualLineCount,
	measureTextWidth,
} from "@workspace/canvas/unstable";
import { TEXT_LINE_HEIGHT } from "@workspace/canvas/unstable-doc";
import type { Dimensions } from "@workspace/geometry";

import { ACTOR_LABEL_STYLE_DEFAULTS } from "../schema/ActorDoc";

/** Empty band between the bottom edge of the box and the top of the label. */
export const ACTOR_LABEL_GAP = 4;

/**
 * Inner padding of the label box. Must stay equal to the `padding: 2px 6px` of
 * TextOverlayFrameStyled's TextContent, or the measured box and the drawn one
 * wrap at different widths.
 */
const ACTOR_LABEL_PADDING_X = 6;
const ACTOR_LABEL_PADDING_Y = 2;

/** Label box width limits (content width + padding, in local px). */
const ACTOR_LABEL_MIN_WIDTH = 16;
const ACTOR_LABEL_MAX_WIDTH = 240;

/**
 * What the label layout reads off the state: the untransformed box size plus the
 * text slots, whose content sizes the label. Typed as the open slot map every
 * text-bearing state carries rather than the actor's own single slot, so the
 * registry's calculator type still accepts it (ObjectTextRegionCalculator 参照).
 */
type ActorLabelState = Dimensions & {
	/** The shape's text slots, keyed by slot id; an absent slot reads as empty. */
	text?: Record<string, TextSlot>;
};

/**
 * Places the actor's label: a box sized from its own text, centered under the
 * bounding box the stick figure fills. Sizing the label from the text instead of
 * from the box is what keeps it legible when the figure is scaled down — the two
 * are independent, exactly as a connector's label is independent of its path.
 *
 * Registered as the actor's text region, so the drawn label (TextOverlay) and the
 * in-place editor resolve the same rectangle; while editing, the grafted draft
 * text (graftTextEditDraft) reaches here, so the box follows every keystroke.
 */
export const calcActorTextRegion: ObjectTextRegionCalculator<
	ActorLabelState
> = (state, slotId) => {
	const slot = state.text?.[slotId];
	const content = slot?.text;
	const text = Array.isArray(content) ? content.join("\n") : (content ?? "");

	const font = {
		fontSize: slot?.fontSize ?? ACTOR_LABEL_STYLE_DEFAULTS.fontSize,
		fontFamily: slot?.fontFamily ?? ACTOR_LABEL_STYLE_DEFAULTS.fontFamily,
		fontWeight: slot?.fontWeight ?? ACTOR_LABEL_STYLE_DEFAULTS.fontWeight,
	};

	const lines = text === "" ? [""] : text.split("\n");
	const longestLineWidth = lines.reduce(
		(widest, line) => Math.max(widest, measureTextWidth(line, font)),
		0,
	);

	const width = Math.min(
		ACTOR_LABEL_MAX_WIDTH,
		Math.max(
			ACTOR_LABEL_MIN_WIDTH,
			longestLineWidth + ACTOR_LABEL_PADDING_X * 2,
		),
	);

	// Count the displayed lines the way the box lays them out, so a line that
	// wraps at the max width reserves the same height while editing and after.
	const visualLineCount = calcVisualLineCount(
		text,
		font,
		width - ACTOR_LABEL_PADDING_X * 2,
	);
	const height =
		visualLineCount * font.fontSize * TEXT_LINE_HEIGHT +
		ACTOR_LABEL_PADDING_Y * 2;

	return {
		x: -width / 2,
		y: state.height / 2 + ACTOR_LABEL_GAP,
		width,
		height,
	};
};
