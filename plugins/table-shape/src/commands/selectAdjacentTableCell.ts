import type { ObjectPartRange } from "@jiscribe/canvas";
import {
	isTextSlotPart,
	readActivePartFocusId,
	TEXT_SLOT_PART_KIND,
} from "@jiscribe/canvas-sdk";
import type { CanvasControllerState } from "@jiscribe/canvas-sdk";

import { countTableTracks } from "../grid/tableTrack";
import {
	parseTableCellTextSlotId,
	tableCellTextSlotId,
	TableFeatures,
} from "../schema/TableDoc";
import type { TableState } from "../state/TableState";

/** Which neighbour of the picked cell a step goes to, on screen before any rotation. */
export type TableCellStepDirection = "up" | "down" | "left" | "right";

/** The row and column offset of one step, rows growing downwards and columns rightwards. */
const TABLE_CELL_STEP_OFFSET: Readonly<
	Record<TableCellStepDirection, { row: number; column: number }>
> = {
	up: { row: -1, column: 0 },
	down: { row: 1, column: 0 },
	left: { row: 0, column: -1 },
	right: { row: 0, column: 1 },
};

/** The cell a step starts from, the table it stands on and the ranges picked now. */
type TableCellStepOrigin = {
	table: TableState;
	row: number;
	column: number;
	pickedRanges: readonly ObjectPartRange[];
};

/**
 * The cell a step starts from, or null when the canvas is in no state to step:
 * a cell pick on the sole selected table, no text edit open, no drag running.
 * Of a picked range it is the active range's focus — the cell the last gesture
 * moved to (readActivePartFocusId).
 */
const readTableCellStepOrigin = (
	state: CanvasControllerState,
): TableCellStepOrigin | null => {
	if (
		state.textEditState !== null ||
		state.activeDrag !== null ||
		state.selection.objectIds.length !== 1
	) {
		return null;
	}
	const object = state.objects[state.selection.objectIds[0]];
	if (object === undefined || object.type !== TableFeatures.type) {
		return null;
	}
	// The part is only ever live on a sole selection, so it is this table's.
	const { part } = state.selection;
	if (!isTextSlotPart(part)) {
		return null;
	}
	const cell = parseTableCellTextSlotId(readActivePartFocusId(part));
	if (cell === null) {
		return null;
	}
	return { table: object as TableState, ...cell, pickedRanges: part.ranges };
};

/**
 * Whether a table cell step can run: a cell pick stands on the sole selected
 * table, no text edit is open and no drag is running. True at the grid's edge
 * too, where the step leaves the pick where it is.
 *
 * @param state - The canvas to read; only the selection, `textEditState` and `activeDrag` are consulted
 * @returns false for every other selection — a whole table, a row or column pick, any other type — so the keys stay with the built-in commands there
 */
export const canSelectAdjacentTableCell = (
	state: CanvasControllerState,
): boolean => readTableCellStepOrigin(state) !== null;

/**
 * Moves the cell pick one cell in `direction`, leaving exactly that cell picked.
 *
 * The step starts from the active range's focus, so a picked range collapses to
 * the focus's neighbour; other ranges are dropped. At the grid's edge the step
 * stays on the focus cell, which leaves a single picked cell as it was and
 * collapses a range onto its focus.
 *
 * @param state - The canvas to step; its `selection.part` names the cell the step starts from, and is live because the reducer reconciles it
 * @param direction - The neighbour to move to, in the table's own grid (rows downwards, columns rightwards), regardless of how the table is rotated
 * @returns A new state with `selection.part` moved and any open ObjectMenu submenu closed; the input state itself when the pick would not change, or when the step cannot run (canSelectAdjacentTableCell)
 */
export const selectAdjacentTableCell = (
	state: CanvasControllerState,
	direction: TableCellStepDirection,
): CanvasControllerState => {
	const origin = readTableCellStepOrigin(state);
	if (origin === null) {
		return state;
	}
	const offset = TABLE_CELL_STEP_OFFSET[direction];
	const clamp = (index: number, count: number): number =>
		Math.min(Math.max(index, 0), count - 1);
	const nextCellId = tableCellTextSlotId(
		clamp(origin.row + offset.row, countTableTracks(origin.table, "row")),
		clamp(
			origin.column + offset.column,
			countTableTracks(origin.table, "column"),
		),
	);

	const { pickedRanges } = origin;
	const isUnchanged =
		pickedRanges.length === 1 &&
		pickedRanges[0].anchorId === nextCellId &&
		pickedRanges[0].focusId === nextCellId;
	if (isUnchanged) {
		return state;
	}
	return {
		...state,
		selection: {
			...state.selection,
			part: {
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: nextCellId, focusId: nextCellId }],
			},
		},
		objectMenuOpenId: null,
	};
};
