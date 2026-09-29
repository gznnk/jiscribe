import type { Command } from "@jiscribe/canvas-sdk";

import { resolveTableTrackSelection } from "./resolveTableTrackSelection";
import { removeTableTracks } from "../grid/removeTableTracks";
import type { TableAxis } from "../grid/tableTrack";
import { tableCommandLabel } from "../messages/tableMessages";
import type { TableCommandId } from "../messages/tableMessages";

/** One command's id, per axis. The wording lives in the dictionary. */
type TableRemoveCommandSpec = {
	axis: TableAxis;
	id: TableCommandId;
};

/**
 * The two removals, named so the right-click menu can offer them in words. The
 * ids are namespaced because the registry refuses a second command under an id
 * already taken, built-in or contributed (CommandRegistry.register).
 *
 * Neither carries a shortcut: Delete over a grip already removes the track it
 * stands for (the `row` / `column` part definitions' `delete`), and a second key
 * for the same act would only be one more thing to collide with the arrows and
 * the nudges.
 */
const TABLE_REMOVE_COMMAND_SPECS: readonly TableRemoveCommandSpec[] = [
	{ axis: "row", id: "table.deleteRow" },
	{ axis: "column", id: "table.deleteColumn" },
];

/**
 * Builds one removal command. It reads the same selection the insertions do, so
 * a picked cell names its row and its column as readily as a grip does — a
 * command that says which track it takes can act on a cell selection where the
 * bare Delete key, which would have to guess, only empties it.
 *
 * The part selection is dropped rather than moved: the removal takes the very
 * tracks it names, so there is nothing left for it to point at. A refusal
 * (removeTableTracks returning null at the last row or the last column) leaves
 * the canvas exactly as it stands, selection included.
 */
const createTableRemoveCommand = (spec: TableRemoveCommandSpec): Command => ({
	id: spec.id,
	label: tableCommandLabel(spec.id),
	category: "edit",

	canExecute: (state) => {
		const selected = resolveTableTrackSelection(state, spec.axis);
		return (
			selected !== null &&
			removeTableTracks(selected.table, spec.axis, selected.indices) !== null
		);
	},

	execute: (state) => {
		const selected = resolveTableTrackSelection(state, spec.axis);
		if (selected === null) {
			return state;
		}
		const removed = removeTableTracks(
			selected.table,
			spec.axis,
			selected.indices,
		);
		if (removed === null) {
			return state;
		}
		return {
			...state,
			objects: { ...state.objects, [selected.objectId]: removed },
			objectPartSelection: null,
			commitVersion: state.commitVersion + 1,
		};
	},
});

/**
 * The table's removal contributions, wired in through `CanvasPlugin.commands`:
 * take the row or the column the selection stands on.
 *
 * Like the insertions, these stay out of the type's ObjectMenu — that menu
 * carries what styles a table, and reshaping the grid belongs to the Delete key,
 * the grips and the right-click menu.
 */
export const TABLE_REMOVE_COMMANDS: readonly Command[] =
	TABLE_REMOVE_COMMAND_SPECS.map(createTableRemoveCommand);
