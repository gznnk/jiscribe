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

/** The slot `offset` steps from the origin's focus along the stacking order, clamped to the slots the record holds. */
const readSteppedRecordSlotId = (
	origin: RecordSlotStepOrigin,
	offset: number,
): RecordTextSlotId => {
	const { presentSlotIds, slotIndex } = origin;
	return presentSlotIds[
		Math.min(Math.max(slotIndex + offset, 0), presentSlotIds.length - 1)
	];
};

/** `state` with the slot pick replaced by `ranges` and any open ObjectMenu submenu closed. */
const withPickedRecordSlotRanges = (
	state: CanvasControllerState,
	ranges: ObjectPartRange[],
): CanvasControllerState => ({
	...state,
	selection: {
		...state.selection,
		part: { kind: TEXT_SLOT_PART_KIND, ranges },
	},
	objectMenuOpenId: null,
});

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
	const nextSlotId = readSteppedRecordSlotId(origin, offset);

	const { pickedRanges } = origin;
	const isUnchanged =
		pickedRanges.length === 1 &&
		pickedRanges[0].anchorId === nextSlotId &&
		pickedRanges[0].focusId === nextSlotId;
	if (isUnchanged) {
		return state;
	}
	return withPickedRecordSlotRanges(state, [
		{ anchorId: nextSlotId, focusId: nextSlotId },
	]);
};

/**
 * Widens or narrows the active range of the slot pick by moving its focus one
 * compartment up or down, the keyboard counterpart of a Shift-click: the anchor
 * stays, so the picked run of compartments (the core's linear range over the
 * slots in stacking order, the same order this walks) grows away from it or
 * shrinks back towards it.
 *
 * Only the active range — the last one, whose focus the last gesture moved
 * (readActivePartFocusId) — changes; the ranges a Ctrl-click added before it
 * stay picked. Compartments the record does not hold are skipped, and at the top
 * or bottom slot the focus stays where it is. Left and right change nothing.
 *
 * @param state - The canvas to extend; its `selection.part` names the range the step starts from, and is live because the reducer reconciles it
 * @param direction - The way the focus moves, in the record's own stacking (up towards the title), regardless of how the record is rotated; left and right change nothing
 * @returns A new state with the active range's focus moved and any open ObjectMenu submenu closed; the input state itself for left and right, when the focus would not move, or when the step cannot run (canSelectAdjacentRecordSlot)
 */
export const extendRecordSlotSelection = (
	state: CanvasControllerState,
	direction: RecordSlotStepDirection,
): CanvasControllerState => {
	const origin = readRecordSlotStepOrigin(state);
	const offset = RECORD_SLOT_STEP_OFFSET[direction];
	if (origin === null || offset === undefined) {
		return state;
	}
	const nextFocusId = readSteppedRecordSlotId(origin, offset);

	const { pickedRanges } = origin;
	const activeRange = pickedRanges[pickedRanges.length - 1];
	if (activeRange.focusId === nextFocusId) {
		return state;
	}
	return withPickedRecordSlotRanges(state, [
		...pickedRanges.slice(0, -1),
		{ anchorId: activeRange.anchorId, focusId: nextFocusId },
	]);
};
