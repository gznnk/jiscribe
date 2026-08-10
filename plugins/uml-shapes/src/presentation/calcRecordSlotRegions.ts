import { isString } from "@jiscribe/basic-validators";
import type { TextSlot } from "@jiscribe/canvas/doc";
import { calcVisualLineCount } from "@jiscribe/canvas-sdk";
import { TEXT_LINE_HEIGHT } from "@jiscribe/canvas-sdk/doc";
import type { Dimensions, Rect } from "@jiscribe/geometry";

import {
	calcRecordListHeight,
	RECORD_BAND_PADDING_X,
	RECORD_BAND_PADDING_Y_TOTAL,
	RECORD_NAME_SLOT_ID,
	RECORD_SLOT_IDS,
	RECORD_SLOT_STYLE_DEFAULTS_BY_ID,
} from "../schema/RecordDoc";
import type { RecordSlotId } from "../schema/RecordDoc";

/**
 * What the region split reads off the state: the untransformed box size plus the
 * slots, whose key set decides which compartments the box has and whose content
 * sizes them. Typed as the open slot map every text-bearing state carries rather
 * than the record's own set, so the registry's calculator type still accepts it
 * (see ObjectTextRegionCalculator).
 */
export type RecordSlotRegionsState = Dimensions & {
	/** The shape's text slots, keyed by slot id; absent is read as a title-only box. */
	text?: Record<string, TextSlot>;
};

/** The record's compartments, keyed by slot id, top to bottom. */
export type RecordSlotRegions = {
	/** Stereotype band above the title; absent when the box does not have one. */
	stereotype?: Rect;
	/** Title band; a record always has one, at the top unless a stereotype band sits over it. */
	name: Rect;
	/** Attribute compartment; absent when the box does not have one. */
	attributes?: Rect;
	/** Operation compartment; absent when the box does not have one. */
	operations?: Rect;
};

/**
 * Height a text band (the stereotype, the title) needs for its slot: every line
 * the text occupies once wrapped in the box width, plus the padding around it.
 * Follows the slot's own typography, falling back to that slot id's defaults, so
 * raising `fontSize` or writing a title too long for the width grows the band
 * instead of clipping it.
 */
const calcBandHeight = (
	width: number,
	slotId: RecordSlotId,
	slot: TextSlot | undefined,
): number => {
	const styleDefaults = RECORD_SLOT_STYLE_DEFAULTS_BY_ID[slotId];
	const text = isString(slot?.text) ? slot.text : "";
	const fontSize = slot?.fontSize ?? styleDefaults.fontSize;
	const lineCount = calcVisualLineCount(
		text,
		{
			fontSize,
			fontFamily: slot?.fontFamily ?? styleDefaults.fontFamily,
			fontWeight: slot?.fontWeight ?? styleDefaults.fontWeight,
		},
		width - RECORD_BAND_PADDING_X * 2,
	);
	return lineCount * fontSize * TEXT_LINE_HEIGHT + RECORD_BAND_PADDING_Y_TOTAL;
};

/**
 * Height a slot asks for. A text band is measured from its wrapped lines; a
 * compartment is measured from its row count and its own `fontSize`, so a row
 * too long for the width wraps and overflows rather than widening the
 * compartment's share.
 */
const calcSlotHeight = (
	width: number,
	slotId: RecordSlotId,
	slot: TextSlot | undefined,
): number => {
	const content = slot?.text;
	return Array.isArray(content)
		? calcRecordListHeight(
				content.length,
				slot?.fontSize ?? RECORD_SLOT_STYLE_DEFAULTS_BY_ID[slotId].fontSize,
			)
		: calcBandHeight(width, slotId, slot);
};

/**
 * Splits the box into its compartments, in local coordinates (origin at the shape
 * center, top-left based). Single source of the record's geometry: the drawing
 * (RecordBox) and the text placement (calcRecordTextRegion, which both the
 * overlays and the in-place editor go through) read it, so a hit region can never
 * drift from the text drawn in it.
 *
 * Which compartments exist comes from the slot keys — `name` always, the rest
 * only where the state has them. Stacking rule: each compartment but the bottom
 * one takes the height its own content asks for, and the bottom one takes
 * whatever is left. So the box's own height is what the compartments divide up;
 * content never grows the box, and content past the bottom edge is clipped.
 *
 * @param state - Untransformed box size plus the slots the compartments are derived from; a height too small for the upper compartments shrinks them in order rather than producing a negative region
 * @returns One region per slot the state has, always with a non-negative height
 */
export const calcRecordSlotRegions = (
	state: RecordSlotRegionsState,
): RecordSlotRegions => {
	const { width, height } = state;
	const left = -width / 2;
	const presentSlotIds = RECORD_SLOT_IDS.filter(
		(slotId) =>
			slotId === RECORD_NAME_SLOT_ID || state.text?.[slotId] !== undefined,
	);

	const placed: Record<string, Rect> = {};
	let top = -height / 2;
	let remaining = Math.max(height, 0);
	presentSlotIds.forEach((slotId, index) => {
		const isLast = index === presentSlotIds.length - 1;
		const slotHeight = isLast
			? remaining
			: Math.min(
					calcSlotHeight(width, slotId, state.text?.[slotId]),
					remaining,
				);
		placed[slotId] = { x: left, y: top, width, height: slotHeight };
		top += slotHeight;
		remaining -= slotHeight;
	});

	// `name` is spelled out because the type has it required, `placed` being keyed
	// by the slot ids this box happens to have.
	return { ...placed, name: placed[RECORD_NAME_SLOT_ID] };
};
