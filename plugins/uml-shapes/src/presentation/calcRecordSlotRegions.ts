import { isString } from "@workspace/basic-validators";
import type { TextSlot } from "@workspace/canvas/doc";
import { calcVisualLineCount } from "@workspace/canvas-sdk";
import { TEXT_LINE_HEIGHT } from "@workspace/canvas-sdk/doc";
import type { Dimensions, Rect } from "@workspace/geometry";

import {
	calcRecordListHeight,
	RECORD_NAME_PADDING_X,
	RECORD_NAME_PADDING_Y_TOTAL,
	RECORD_NAME_SLOT_ID,
	RECORD_SLOT_IDS,
	RECORD_SLOT_STYLE_DEFAULTS,
} from "../schema/RecordDoc";
import type { RecordListSlotId } from "../schema/RecordDoc";

/**
 * What the region split reads off the state: the untransformed box size plus the
 * slots, whose key set decides which compartments the box has and whose content
 * sizes them. Typed as the open slot map every text-bearing state carries rather
 * than the record's own set, so the registry's calculator type still accepts it
 * (ObjectTextRegionCalculator 参照).
 */
export type RecordSlotRegionsState = Dimensions & {
	/** The shape's text slots, keyed by slot id; absent is read as a title-only box. */
	text?: Record<string, TextSlot>;
};

/** The record's compartments, keyed by slot id, top to bottom. */
export type RecordSlotRegions = {
	/** Title band across the top; a record always has one. */
	name: Rect;
	/** Attribute compartment; absent when the box does not have one. */
	attributes?: Rect;
	/** Operation compartment; absent when the box does not have one. */
	operations?: Rect;
};

/**
 * Height the title band needs for its slot: every line the title occupies once
 * wrapped in the box width, plus the padding around it. Follows the slot's own
 * typography, so raising `fontSize` or writing a title too long for the width
 * grows the band instead of clipping it.
 */
const calcNameHeight = (
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
 * Height a slot asks for. The title is measured from its wrapped lines; a
 * compartment is measured from its row count alone, so a row too long for the
 * width wraps and overflows rather than widening the compartment's share.
 */
const calcSlotHeight = (width: number, slot: TextSlot | undefined): number => {
	const content = slot?.text;
	return Array.isArray(content)
		? calcRecordListHeight(content.length)
		: calcNameHeight(width, slot);
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
			: Math.min(calcSlotHeight(width, state.text?.[slotId]), remaining);
		placed[slotId] = { x: left, y: top, width, height: slotHeight };
		top += slotHeight;
		remaining -= slotHeight;
	});

	const regions: RecordSlotRegions = { name: placed[RECORD_NAME_SLOT_ID] };
	for (const slotId of presentSlotIds) {
		if (slotId !== RECORD_NAME_SLOT_ID) {
			regions[slotId satisfies RecordListSlotId] = placed[slotId];
		}
	}
	return regions;
};
