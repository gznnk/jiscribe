import type { ObjectPartRange } from "@jiscribe/canvas";
import {
	isTextSlotPart,
	readActivePartFocusId,
	TEXT_SLOT_PART_KIND,
} from "@jiscribe/canvas-sdk";
import type { CanvasControllerState } from "@jiscribe/canvas-sdk";

import { readErEntityCommandTarget } from "./readErEntityCommandTarget";
import {
	countErEntityColumns,
	erEntityColumnTextSlotId,
	parseErEntityColumnTextSlotId,
} from "../schema/erEntityColumnIds";
import {
	ER_ENTITY_COLUMN_FIELDS,
	ER_ENTITY_NAME_TEXT_SLOT_ID,
} from "../schema/ErEntityDoc";

/** Which neighbour of the picked slot a step goes to, on screen before any rotation. */
export type ErEntityTextSlotStepDirection = "up" | "down" | "left" | "right";

/** The slot a step starts from, how many columns the entity has and the ranges picked now. */
type ErEntityTextSlotStepOrigin = {
	focusSlotId: string;
	columnCount: number;
	pickedRanges: readonly ObjectPartRange[];
};

/**
 * The slot a step starts from, or null when the canvas is in no state to step:
 * a slot pick on the sole selected entity, no text edit open, no drag running.
 * Of a picked range it is the active range's focus (readActivePartFocusId).
 */
const readErEntityTextSlotStepOrigin = (
	state: CanvasControllerState,
): ErEntityTextSlotStepOrigin | null => {
	if (state.drag !== null) {
		return null;
	}
	const target = readErEntityCommandTarget(state);
	// The part is only ever live on a sole selection, so it is this entity's.
	const { part } = state.selection;
	if (target === null || !isTextSlotPart(part)) {
		return null;
	}
	const focusSlotId = readActivePartFocusId(part);
	if (!Object.prototype.hasOwnProperty.call(target.entity.text, focusSlotId)) {
		return null;
	}
	return {
		focusSlotId,
		columnCount: countErEntityColumns(target.entity.text),
		pickedRanges: part.ranges,
	};
};

/**
 * Whether an entity slot step can run: a slot pick stands on the sole selected
 * entity, no text edit is open and no drag is running. True at the grid's edge
 * too, where the step leaves the pick where it is.
 *
 * @param state - The canvas to read; only the selection, `mode` and `drag` are consulted
 * @returns false for every other selection — a column pick, a whole entity, any other type, several objects — so the keys stay with the column commands or the built-in nudge there
 */
export const canSelectAdjacentErEntityTextSlot = (
	state: CanvasControllerState,
): boolean => readErEntityTextSlotStepOrigin(state) !== null;

/**
 * The slot one step from the origin's focus in `direction`, staying put at the
 * grid's edge. The title is a full-width row above column 0: down from it lands
 * on column 0's name, up from any field of column 0 lands on it, and left and
 * right leave it where it is.
 */
const readSteppedTextSlotId = (
	origin: ErEntityTextSlotStepOrigin,
	direction: ErEntityTextSlotStepDirection,
): string => {
	const { focusSlotId, columnCount } = origin;
	const focusColumnSlot = parseErEntityColumnTextSlotId(focusSlotId);
	if (focusColumnSlot === null) {
		return direction === "down" && columnCount > 0
			? erEntityColumnTextSlotId(0, "name")
			: focusSlotId;
	}
	const { columnIndex, field } = focusColumnSlot;
	const fieldIndex = ER_ENTITY_COLUMN_FIELDS.indexOf(field);
	switch (direction) {
		case "up":
			if (columnIndex === 0) {
				return ER_ENTITY_NAME_TEXT_SLOT_ID;
			}
			return erEntityColumnTextSlotId(columnIndex - 1, field);
		case "down":
			return erEntityColumnTextSlotId(
				Math.min(columnIndex + 1, columnCount - 1),
				field,
			);
		case "left":
			return erEntityColumnTextSlotId(
				columnIndex,
				ER_ENTITY_COLUMN_FIELDS[Math.max(fieldIndex - 1, 0)],
			);
		case "right":
			return erEntityColumnTextSlotId(
				columnIndex,
				ER_ENTITY_COLUMN_FIELDS[
					Math.min(fieldIndex + 1, ER_ENTITY_COLUMN_FIELDS.length - 1)
				],
			);
	}
};

/** `state` with the slot pick replaced by `ranges` and any open ObjectMenu submenu closed. */
const withPickedTextSlotRanges = (
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
 * Moves the slot pick one slot in `direction`, leaving exactly that slot picked.
 * Up and down keep the field (key, name or type) and left and right the column;
 * the title is a full-width row above column 0, which down leaves for column 0's
 * name.
 *
 * The step starts from the active range's focus, so a picked range collapses to
 * the focus's neighbour; other ranges are dropped. At the grid's edge the step
 * stays on the focus slot, which leaves a single picked slot as it was and
 * collapses a range onto its focus.
 *
 * @param state - The canvas to step; its `selection.part` names the slot the step starts from, and is live because the reducer reconciles it
 * @param direction - The neighbour to move to, in the entity's own rows (up towards the title) and fields (key at the left), regardless of how the entity is rotated
 * @returns A new state with `selection.part` moved and any open ObjectMenu submenu closed; the input state itself when the pick would not change, or when the step cannot run (canSelectAdjacentErEntityTextSlot)
 */
export const selectAdjacentErEntityTextSlot = (
	state: CanvasControllerState,
	direction: ErEntityTextSlotStepDirection,
): CanvasControllerState => {
	const origin = readErEntityTextSlotStepOrigin(state);
	if (origin === null) {
		return state;
	}
	const nextSlotId = readSteppedTextSlotId(origin, direction);

	const { pickedRanges } = origin;
	const isUnchanged =
		pickedRanges.length === 1 &&
		pickedRanges[0].anchorId === nextSlotId &&
		pickedRanges[0].focusId === nextSlotId;
	if (isUnchanged) {
		return state;
	}
	return withPickedTextSlotRanges(state, [
		{ anchorId: nextSlotId, focusId: nextSlotId },
	]);
};

/**
 * Widens or narrows the active range of the slot pick by moving its focus one
 * slot in `direction`, the keyboard counterpart of a Shift-click: the anchor
 * stays, so the picked rectangle (collectErEntityTextSlotRange, the title
 * spanning every field) grows away from it or shrinks back towards it.
 *
 * Only the active range — the last one, whose focus the last gesture moved
 * (readActivePartFocusId) — changes; the ranges a Ctrl-click added before it
 * stay picked. The focus steps as selectAdjacentErEntityTextSlot's pick does,
 * and at the grid's edge it stays where it is.
 *
 * @param state - The canvas to extend; its `selection.part` names the range the step starts from, and is live because the reducer reconciles it
 * @param direction - The way the focus moves, in the entity's own rows (up towards the title) and fields (key at the left), regardless of how the entity is rotated
 * @returns A new state with the active range's focus moved and any open ObjectMenu submenu closed; the input state itself when the focus would not move, or when the step cannot run (canSelectAdjacentErEntityTextSlot)
 */
export const extendErEntityTextSlotSelection = (
	state: CanvasControllerState,
	direction: ErEntityTextSlotStepDirection,
): CanvasControllerState => {
	const origin = readErEntityTextSlotStepOrigin(state);
	if (origin === null) {
		return state;
	}
	const nextFocusId = readSteppedTextSlotId(origin, direction);

	const { pickedRanges } = origin;
	const activeRange = pickedRanges[pickedRanges.length - 1];
	if (activeRange.focusId === nextFocusId) {
		return state;
	}
	return withPickedTextSlotRanges(state, [
		...pickedRanges.slice(0, -1),
		{ anchorId: activeRange.anchorId, focusId: nextFocusId },
	]);
};
