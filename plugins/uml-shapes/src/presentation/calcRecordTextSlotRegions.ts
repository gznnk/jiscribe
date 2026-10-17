import type { Dimensions, Rect } from "@jiscribe/geometry";

import {
	calcRecordTextSlotHeight,
	listRecordPresentTextSlotIds,
} from "../schema/calcRecordContentHeight";
import type { RecordTextSlotsContent } from "../schema/calcRecordContentHeight";
import { RECORD_NAME_TEXT_SLOT_ID } from "../schema/RecordDoc";

/**
 * What the region split reads off the state: the untransformed box size plus the
 * slots, whose key set decides which compartments the box has and whose content
 * sizes them. Typed as the open slot map every text-bearing state carries rather
 * than the record's own set, so the registry's calculator type still accepts it
 * (see ObjectTextSlotRegionsCalculator).
 */
export type RecordTextSlotRegionsState = Dimensions & RecordTextSlotsContent;

/** The record's compartments, keyed by slot id, top to bottom. */
export type RecordTextSlotRegions = {
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
 * Splits the box into its compartments, in local coordinates (origin at the shape
 * center, top-left based). Single source of the record's geometry: the drawing
 * (RecordBox) and the text placement (the `"textSlot"` part kind's `regions`,
 * which both the overlays and the in-place editor go through) read it, so a hit
 * region can never drift from the text drawn in it.
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
export const calcRecordTextSlotRegions = (
	state: RecordTextSlotRegionsState,
): RecordTextSlotRegions => {
	const { width, height } = state;
	const left = -width / 2;
	const presentSlotIds = listRecordPresentTextSlotIds(state.text);

	const placed: Record<string, Rect> = {};
	let top = -height / 2;
	let remaining = Math.max(height, 0);
	presentSlotIds.forEach((slotId, index) => {
		const isLast = index === presentSlotIds.length - 1;
		const slotHeight = isLast
			? remaining
			: Math.min(
					calcRecordTextSlotHeight(width, slotId, state.text?.[slotId]),
					remaining,
				);
		placed[slotId] = { x: left, y: top, width, height: slotHeight };
		top += slotHeight;
		remaining -= slotHeight;
	});

	// `name` is spelled out because the type has it required, `placed` being keyed
	// by the slot ids this box happens to have.
	return { ...placed, name: placed[RECORD_NAME_TEXT_SLOT_ID] };
};
