import { readActivePartFocusId } from "@jiscribe/canvas-sdk";
import type {
	CanvasControllerState,
	ExecutableCommand,
} from "@jiscribe/canvas-sdk";

import { openErEntityTextSlotEditor } from "./openErEntityTextSlotEditor";
import { readErEntityCommandTarget } from "./readErEntityCommandTarget";
import { parseErEntityLanePartId } from "../parts/erEntityLaneIds";
import type { ErEntityLane } from "../parts/erEntityLaneIds";
import { ER_ENTITY_LANE_PART_KIND } from "../parts/erEntityLanePartKind";
import {
	countErEntityColumns,
	erEntityColumnTextSlotId,
} from "../schema/erEntityColumnIds";

/** The active lane of a lane pick — its active range's focus — or null when none is picked or the entity has no rows. */
const readPickedLane = (state: CanvasControllerState): ErEntityLane | null => {
	const target = readErEntityCommandTarget(state);
	const pick = state.selection.part;
	if (
		target === null ||
		pick === null ||
		pick.kind !== ER_ENTITY_LANE_PART_KIND ||
		countErEntityColumns(target.entity.text) === 0
	) {
		return null;
	}
	return parseErEntityLanePartId(readActivePartFocusId(pick));
};

/**
 * Enter over a lane pick: opens the editor on the active lane's slot in the
 * first row, where the lane starts. Claimed ahead of the built-in Enter, which
 * would open the title for a pick that is not a slot.
 */
const editErEntityLaneCommand: ExecutableCommand = {
	id: "erEntity.editLane",
	label: { en: "Edit Lane", ja: "縦列を編集" },
	category: "edit",
	shortcuts: { default: [{ code: "Enter" }] },

	canExecute: (state) => readPickedLane(state) !== null,

	execute: (state) => {
		const target = readErEntityCommandTarget(state);
		const lane = readPickedLane(state);
		if (target === null || lane === null) {
			return state;
		}
		return openErEntityTextSlotEditor(
			state,
			target.entity,
			erEntityColumnTextSlotId(0, lane),
		);
	},
};

/**
 * The entity's lane command contributions, wired in through
 * `CanvasPlugin.commands`: Enter over a lane pick. Delete is the built-in one,
 * which empties the lane through its part kind's `delete`.
 */
export const ER_ENTITY_LANE_COMMANDS: readonly ExecutableCommand[] = [
	editErEntityLaneCommand,
];
