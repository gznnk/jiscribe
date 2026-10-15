import type { ObjectPartRange } from "@jiscribe/canvas";
import {
	isTextSlotPart,
	readActivePartFocusId,
	TEXT_SLOT_PART_KIND,
} from "@jiscribe/canvas-sdk";
import type { CanvasControllerState } from "@jiscribe/canvas-sdk";

import { RECORD_TEXT_SLOT_IDS, RecordFeatures } from "../schema/RecordDoc";
import type { RecordTextSlotId } from "../schema/RecordDoc";
import type { RecordState } from "../state/RecordState";

/** Which way a step goes, on screen before any rotation. */
export type RecordSlotStepDirection = "up" | "down" | "left" | "right";

/**
 * How many slots a step moves along the stacking order. Left and right are
 * absent: a single column of compartments has no neighbour that way.
 */
const RECORD_SLOT_STEP_OFFSET: Readonly<
	Partial<Record<RecordSlotStepDirection, number>>
> = {
	up: -1,
	down: 1,
};

/** The slot a step starts from, the slots the record holds and the ranges picked now. */
type RecordSlotStepOrigin = {
	presentSlotIds: readonly RecordTextSlotId[];
	slotIndex: number;
	pickedRanges: readonly ObjectPartRange[];
};

/**
 * The slot a step starts from, or null when the canvas is in no state to step:
 * a slot pick on the sole selected record, no text edit open, no drag running.
 * Of a picked range it is the active range's focus (readActivePartFocusId).
 */
const readRecordSlotStepOrigin = (
	state: CanvasControllerState,
): RecordSlotStepOrigin | null => {
	if (
		state.textEditState !== null ||
		state.activeDrag !== null ||
		state.selection.objectIds.length !== 1
	) {
		return null;
	}
	const object = state.objects[state.selection.objectIds[0]];
	if (object === undefined || object.type !== RecordFeatures.type) {
		return null;
	}
	// The part is only ever live on a sole selection, so it is this record's.
	const { part } = state.selection;
	if (!isTextSlotPart(part)) {
		return null;
	}
	const { text } = object as RecordState;
	const presentSlotIds = RECORD_TEXT_SLOT_IDS.filter(
		(slotId) => text[slotId] !== undefined,
	);
	const slotIndex = (presentSlotIds as readonly string[]).indexOf(
		readActivePartFocusId(part),
	);
	if (slotIndex === -1) {
		return null;
	}
	return { presentSlotIds, slotIndex, pickedRanges: part.ranges };
};

/**
 * Whether a record slot step can run: a slot pick stands on the sole selected
 * record, no text edit is open and no drag is running. True at the top and
 * bottom slot and for left and right too, where the step leaves the pick where
 * it is.
 *
 * @param state - The canvas to read; only the selection, `textEditState` and `activeDrag` are consulted
 * @returns false for every other selection — a whole record, any other type, several objects — so the keys stay with the built-in commands there
 */
export const canSelectAdjacentRecordSlot = (
	state: CanvasControllerState,
): boolean => readRecordSlotStepOrigin(state) !== null;

/**
 * Moves the slot pick to the compartment above or below, leaving exactly that
 * slot picked.
 *
 * The step walks the slots the record holds, in the order their compartments
 * stack, so an absent stereotype, attributes or operations compartment is
 * skipped. It starts from the active range's focus, so a picked range collapses
 * to the focus's neighbour; other ranges are dropped. At the top or bottom slot
 * the step stays on the focus slot, which leaves a single picked slot as it was
 * and collapses a range onto its focus. Left and right leave the pick untouched,
 * ranges included.
 *
 * @param state - The canvas to step; its `selection.part` names the slot the step starts from, and is live because the reducer reconciles it
 * @param direction - The way to move, in the record's own stacking (up towards the title), regardless of how the record is rotated; left and right change nothing
 * @returns A new state with `selection.part` moved and any open ObjectMenu submenu closed; the input state itself for left and right, when the pick would not change, or when the step cannot run (canSelectAdjacentRecordSlot)
 */
export const selectAdjacentRecordSlot = (
	state: CanvasControllerState,
	direction: RecordSlotStepDirection,
): CanvasControllerState => {
	const origin = readRecordSlotStepOrigin(state);
	const offset = RECORD_SLOT_STEP_OFFSET[direction];
	if (origin === null || offset === undefined) {
		return state;
	}
	const { presentSlotIds, slotIndex, pickedRanges } = origin;
	const nextIndex = Math.min(
		Math.max(slotIndex + offset, 0),
		presentSlotIds.length - 1,
	);
	const nextSlotId = presentSlotIds[nextIndex];

	const isUnchanged =
		pickedRanges.length === 1 &&
		pickedRanges[0].anchorId === nextSlotId &&
		pickedRanges[0].focusId === nextSlotId;
	if (isUnchanged) {
		return state;
	}
	return {
		...state,
		selection: {
			...state.selection,
			part: {
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: nextSlotId, focusId: nextSlotId }],
			},
		},
		objectMenuOpenId: null,
	};
};
