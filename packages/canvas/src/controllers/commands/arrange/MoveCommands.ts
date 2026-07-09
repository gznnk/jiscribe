import type { Point } from "@workspace/geometry";

import type { CanvasControllerState } from "../../CanvasTypes";
import type { ICanvasRegistries } from "../../setup/ICanvasRegistries";
import { moveSelection } from "../../utils/moveSelection";
import { updateAffectedGroupBounds } from "../../utils/updateAffectedGroupBounds";
import type { Command } from "../CommandTypes";

/** Normal move distance (canvas coordinates, px) */
const NUDGE_STEP = 1;
/** Move distance when Shift is held (canvas coordinates, px) */
const NUDGE_STEP_LARGE = 10;

/** Prefix of the coalesce key for consecutive nudges (a changed selection counts as a separate operation) */
const MOVE_COALESCE_PREFIX = "move";

export type NudgeDirection = "up" | "down" | "left" | "right";

const ARROW_CODE: Record<NudgeDirection, string> = {
	up: "ArrowUp",
	down: "ArrowDown",
	left: "ArrowLeft",
	right: "ArrowRight",
};

/** Display label per direction (for the shortcuts list) */
const DIRECTION_LABEL: Record<NudgeDirection, string> = {
	up: "Move Up",
	down: "Move Down",
	left: "Move Left",
	right: "Move Right",
};

/** Builds a move vector from a direction and distance (screen coordinates: down is +y) */
const calcNudgeDelta = (direction: NudgeDirection, step: number): Point => {
	switch (direction) {
		case "up":
			return { x: 0, y: -step };
		case "down":
			return { x: 0, y: step };
		case "left":
			return { x: -step, y: 0 };
		case "right":
			return { x: step, y: 0 };
	}
};

/**
 * Factory that creates a nudge command (moving the selection via arrow keys).
 * Produces one command per direction × normal/Shift (larger move) combination.
 */
const createMoveCommand = (
	direction: NudgeDirection,
	step: number,
): Command => {
	const isLarge = step === NUDGE_STEP_LARGE;
	return {
		id: `move-${direction}${isLarge ? "-large" : ""}`,
		// e.g. "Move Up" / "Move Up (10px)" (larger move when Shift is held)
		label: `${DIRECTION_LABEL[direction]}${isLarge ? ` (${NUDGE_STEP_LARGE}px)` : ""}`,
		category: "arrange",
		shortcuts: {
			default: [{ code: ARROW_CODE[direction], shift: isLarge }],
		},
		// Disabled during text editing so caret movement takes priority
		canExecute: (state: CanvasControllerState) =>
			state.selectedIds.length > 0 && state.textEditState === null,
		execute: (state: CanvasControllerState, registries: ICanvasRegistries) => {
			const { objects, multiSelectGroup } = moveSelection({
				selectedIds: state.selectedIds,
				srcObjects: state.objects,
				srcMultiSelectGroup: state.multiSelectGroup,
				delta: calcNudgeDelta(direction, step),
				objectBehavior: registries.objectBehavior,
			});
			// A nudge is a committing operation, so recompute and commit the parent group bounds each time
			const moved = updateAffectedGroupBounds(
				{ ...state, objects, multiSelectGroup },
				state.selectedIds,
			);
			// Coalesce consecutive nudges to the same selection (including key repeat) into
			// a single undo. Since the selection IDs are part of the key, a changed target
			// automatically becomes a separate entry.
			// pending is set only together with a commit (the history layer consumes it and resets to null).
			return {
				...moved,
				commitVersion: state.commitVersion + 1,
				historyCoalesce: {
					...state.historyCoalesce,
					pending: `${MOVE_COALESCE_PREFIX}:${state.selectedIds.join(",")}`,
				},
			};
		},
	};
};

const NUDGE_DIRECTIONS: NudgeDirection[] = ["up", "down", "left", "right"];

/** The 8 move commands: up/down/left/right × normal/Shift */
export const moveCommands: Command[] = NUDGE_DIRECTIONS.flatMap((direction) => [
	createMoveCommand(direction, NUDGE_STEP),
	createMoveCommand(direction, NUDGE_STEP_LARGE),
]);
