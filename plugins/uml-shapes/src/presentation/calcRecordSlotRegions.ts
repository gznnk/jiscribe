import { isString } from "@workspace/basic-validators";
import type { TextSlot } from "@workspace/canvas/doc";
import { calcVisualLineCount } from "@workspace/canvas/unstable";
import { TEXT_LINE_HEIGHT } from "@workspace/canvas/unstable-doc";
import type { Dimensions, Rect } from "@workspace/geometry";

import {
	RECORD_NAME_PADDING_X,
	RECORD_NAME_PADDING_Y_TOTAL,
	RECORD_NAME_SLOT_ID,
	RECORD_SLOT_STYLE_DEFAULTS,
} from "../schema/RecordDoc";

/**
 * What the region split reads off the state: the untransformed box size plus the
 * slots, of which only `name` is used (its text and typography size the title
 * band). Typed as the open slot map every text-bearing state carries rather than
 * the record's own closed pair, so the registry's calculator type still accepts
 * it (ObjectTextRegionCalculator 参照).
 */
export type RecordSlotRegionsState = Dimensions & {
	/** The shape's text slots, keyed by slot id; absent is read as an empty title. */
	text?: Record<string, TextSlot>;
};

/** The record's two compartments, keyed by slot id. */
export type RecordSlotRegions = {
	/** Title band across the top. */
	name: Rect;
	/** Everything below the band. */
	rows: Rect;
};

/**
 * Height the title band needs for its slot: every line the title occupies once
 * wrapped in the box width, plus the padding around it. Follows the slot's own
 * typography, so raising `fontSize` or writing a title too long for the width
 * grows the band instead of clipping it.
 */
const calcRecordHeaderHeight = (
	width: number,
	nameSlot: TextSlot | undefined,
): number => {
	const text = isString(nameSlot?.text) ? nameSlot.text : "";
	const fontSize = nameSlot?.fontSize ?? RECORD_SLOT_STYLE_DEFAULTS.fontSize;
	const lineCount = calcVisualLineCount(
		text,
		{
			fontSize,
			fontFamily: nameSlot?.fontFamily ?? RECORD_SLOT_STYLE_DEFAULTS.fontFamily,
			fontWeight: nameSlot?.fontWeight ?? RECORD_SLOT_STYLE_DEFAULTS.fontWeight,
		},
		width - RECORD_NAME_PADDING_X * 2,
	);
	return lineCount * fontSize * TEXT_LINE_HEIGHT + RECORD_NAME_PADDING_Y_TOTAL;
};

/**
 * Splits the box into its two compartments, in local coordinates (origin at the
 * shape center, top-left based). Single source of the record's geometry: the
 * drawing (RecordBox) and the text placement (calcRecordTextRegion, which both
 * the overlays and the in-place editor go through) read it, so a hit region can
 * never drift from the text drawn in it.
 *
 * The title band grows with its own text (see calcRecordHeaderHeight); the rows
 * take whatever is left, and a row too long for the width wraps and overflows
 * the compartment because the height budget counts rows, not visual lines.
 *
 * @param state - Untransformed box size plus the slots the band is sized from; a height below the band height shrinks the band rather than producing a negative rows region
 * @returns Both regions, always with a non-negative height
 */
export const calcRecordSlotRegions = (
	state: RecordSlotRegionsState,
): RecordSlotRegions => {
	const { width, height } = state;
	const left = -width / 2;
	const top = -height / 2;
	const headerHeight = Math.min(
		calcRecordHeaderHeight(width, state.text?.[RECORD_NAME_SLOT_ID]),
		Math.max(height, 0),
	);
	return {
		name: { x: left, y: top, width, height: headerHeight },
		rows: {
			x: left,
			y: top + headerHeight,
			width,
			height: Math.max(height, 0) - headerHeight,
		},
	};
};
