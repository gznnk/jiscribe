import type { ObjectPartRange } from "@jiscribe/canvas";
import { readActivePartFocusId } from "@jiscribe/canvas-sdk";
import type { CanvasControllerState } from "@jiscribe/canvas-sdk";

import { readErEntityCommandTarget } from "./readErEntityCommandTarget";
import { ER_ENTITY_COLUMN_PART_KIND } from "../parts/erEntityColumnPartKind";
import {
	erEntityColumnPartId,
	parseErEntityColumnPartId,
	countErEntityColumns,
} from "../schema/erEntityColumnIds";

/** Which way a step goes, on screen before any rotation. */
export type ErEntityColumnStepDirection = "up" | "down" | "left" | "right";

/**
 * How many rows a step moves down the declared order. Left and right are absent:
 * the columns stand in a single stack of rows, with no neighbour that way.
 */
const ER_ENTITY_COLUMN_STEP_OFFSET: Readonly<
	Partial<Record<ErEntityColumnStepDirection, number>>
> = {
	up: -1,
	down: 1,
};

/** The column a step starts from, how many columns the entity has and the ranges picked now. */
type ErEntityColumnStepOrigin = {
	focusColumnIndex: number;
	columnCount: number;
	pickedRanges: readonly ObjectPartRange[];
};

/**
 * The column a step starts from, or null when the canvas is in no state to
 * step: a column pick on the sole selected entity, no text edit open, no drag
 * running. Of a picked range it is the active range's focus
 * (readActivePartFocusId).
 */
const readErEntityColumnStepOrigin = (
	state: CanvasControllerState,
): ErEntityColumnStepOrigin | null => {
	if (state.activeDrag !== null) {
		return null;
	}
	const target = readErEntityCommandTarget(state);
	// The part is only ever live on a sole selection, so it is this entity's.
	const { part } = state.selection;
	if (
		target === null ||
		part === null ||
		part.kind !== ER_ENTITY_COLUMN_PART_KIND
	) {
		return null;
	}
	const columnCount = countErEntityColumns(target.entity.text);
	const focusColumnIndex = parseErEntityColumnPartId(
		readActivePartFocusId(part),
	);
	if (focusColumnIndex === null || focusColumnIndex >= columnCount) {
		return null;
	}
	return { focusColumnIndex, columnCount, pickedRanges: part.ranges };
};

/**
 * Whether an entity column step can run: a column pick stands on the sole
 * selected entity, no text edit is open and no drag is running. True at the top
 * and bottom row and for left and right too, where the step leaves the pick
 * where it is.
 *
 * @param state - The canvas to read; only the selection, `textEditState` and `activeDrag` are consulted
 * @returns false for every other selection — a slot pick, a whole entity, any other type, several objects — so the keys stay with the built-in commands there
 */
export const canSelectAdjacentErEntityColumn = (
	state: CanvasControllerState,
): boolean => readErEntityColumnStepOrigin(state) !== null;

/** The column `offset` rows from the origin's focus, clamped to the rows the entity draws. */
const readSteppedColumnPartId = (
	origin: ErEntityColumnStepOrigin,
	offset: number,
): string => {
	const { focusColumnIndex, columnCount } = origin;
	return erEntityColumnPartId(
		Math.min(Math.max(focusColumnIndex + offset, 0), columnCount - 1),
	);
};

/** `state` with the column pick replaced by `ranges` and any open ObjectMenu submenu closed. */
const withPickedColumnRanges = (
	state: CanvasControllerState,
	ranges: ObjectPartRange[],
): CanvasControllerState => ({
	...state,
	selection: {
		...state.selection,
		part: { kind: ER_ENTITY_COLUMN_PART_KIND, ranges },
	},
	objectMenuOpenId: null,
});

/**
 * Moves the column pick to the row above or below, leaving exactly that column
 * picked.
 *
 * The step starts from the active range's focus, so a picked range collapses to
 * the focus's neighbour; other ranges are dropped. At the top or bottom row the
 * step stays on the focus column, which leaves a single picked column as it was
 * and collapses a range onto its focus.
 * Left and right leave the pick untouched, ranges included.
 *
 * @param state - The canvas to step; its `selection.part` names the column the step starts from, and is live because the reducer reconciles it
 * @param direction - The way to move, in the entity's own rows (up towards the title), regardless of how the entity is rotated; left and right change nothing
 * @returns A new state with `selection.part` moved and any open ObjectMenu submenu closed; the input state itself for left and right, when the pick would not change, or when the step cannot run (canSelectAdjacentErEntityColumn)
 */
export const selectAdjacentErEntityColumn = (
	state: CanvasControllerState,
	direction: ErEntityColumnStepDirection,
): CanvasControllerState => {
	const origin = readErEntityColumnStepOrigin(state);
	const offset = ER_ENTITY_COLUMN_STEP_OFFSET[direction];
	if (origin === null || offset === undefined) {
		return state;
	}
	const nextPartId = readSteppedColumnPartId(origin, offset);

	const { pickedRanges } = origin;
	const isUnchanged =
		pickedRanges.length === 1 &&
		pickedRanges[0].anchorId === nextPartId &&
		pickedRanges[0].focusId === nextPartId;
	if (isUnchanged) {
		return state;
	}
	return withPickedColumnRanges(state, [
		{ anchorId: nextPartId, focusId: nextPartId },
	]);
};

/**
 * Widens or narrows the active range of the column pick by moving its focus one
 * row up or down, the keyboard counterpart of a Shift-click on a grip: the
 * anchor stays, so the picked run of rows grows away from it or shrinks back
 * towards it.
 *
 * Only the active range — the last one, whose focus the last gesture moved
 * (readActivePartFocusId) — changes; the ranges a Ctrl-click added before it
 * stay picked. The step walks the rows in declared order, the order the range
 * runs over (ER_ENTITY_COLUMN_PART_DEFINITION's `list`), and at the top or bottom row the
 * focus stays where it is. Left and right change nothing.
 *
 * @param state - The canvas to extend; its `selection.part` names the range the step starts from, and is live because the reducer reconciles it
 * @param direction - The way the focus moves, in the entity's own rows (up towards the title), regardless of how the entity is rotated; left and right change nothing
 * @returns A new state with the active range's focus moved and any open ObjectMenu submenu closed; the input state itself for left and right, when the focus would not move, or when the step cannot run (canSelectAdjacentErEntityColumn)
 */
export const extendErEntityColumnSelection = (
	state: CanvasControllerState,
	direction: ErEntityColumnStepDirection,
): CanvasControllerState => {
	const origin = readErEntityColumnStepOrigin(state);
	const offset = ER_ENTITY_COLUMN_STEP_OFFSET[direction];
	if (origin === null || offset === undefined) {
		return state;
	}
	const nextFocusId = readSteppedColumnPartId(origin, offset);

	const { pickedRanges } = origin;
	const activeRange = pickedRanges[pickedRanges.length - 1];
	if (activeRange.focusId === nextFocusId) {
		return state;
	}
	return withPickedColumnRanges(state, [
		...pickedRanges.slice(0, -1),
		{ anchorId: activeRange.anchorId, focusId: nextFocusId },
	]);
};
