import type { Command, KeyBinding } from "@jiscribe/canvas-sdk";

import { resolveTableInsertTarget } from "./resolveTableInsertTarget";
import type { TableInsertSide } from "./resolveTableInsertTarget";
import { insertTableTrack } from "../grid/insertTableTrack";
import { remapTablePartSelectionForInsert } from "../grid/remapTablePartSelectionForInsert";
import type { TableAxis } from "../grid/tableTrack";

/** One command's id, menu label and key, per axis and side. */
type TableInsertCommandSpec = {
	axis: TableAxis;
	side: TableInsertSide;
	id: string;
	label: string;
	/** The arrow the new track appears in the direction of. */
	arrowCode: string;
};

/**
 * The four insertions, named so a menu can list them without knowing what a track
 * is. The ids are namespaced because the registry refuses a second command under
 * an id already taken, built-in or contributed (CommandRegistry.register).
 *
 * Alt+Shift plus the arrow the new track appears in the direction of. The
 * modifier check is exact, so neither the bare arrows nor the Shift-held ones —
 * the nudges — can collide with these. Alt alone would not have done: a browser
 * steers its history with Alt+Left and Alt+Right, and these commands are
 * unavailable most of the time, which is exactly when the keystroke would reach
 * it.
 */
const TABLE_INSERT_COMMAND_SPECS: readonly TableInsertCommandSpec[] = [
	{
		axis: "row",
		side: "before",
		id: "table.insertRowAbove",
		label: "Insert Row Above",
		arrowCode: "ArrowUp",
	},
	{
		axis: "row",
		side: "after",
		id: "table.insertRowBelow",
		label: "Insert Row Below",
		arrowCode: "ArrowDown",
	},
	{
		axis: "column",
		side: "before",
		id: "table.insertColumnLeft",
		label: "Insert Column Left",
		arrowCode: "ArrowLeft",
	},
	{
		axis: "column",
		side: "after",
		id: "table.insertColumnRight",
		label: "Insert Column Right",
		arrowCode: "ArrowRight",
	},
];

/** The binding one spec answers to, on every platform. */
const toKeyBinding = (spec: TableInsertCommandSpec): KeyBinding => ({
	code: spec.arrowCode,
	alt: true,
	shift: true,
});

/**
 * Builds one insert command. The selection is moved with the grid: cell and track
 * ids are positional, so an insertion renames every part behind it and a selection
 * left as written would come out one track along
 * (remapTablePartSelectionForInsert).
 *
 * `commitVersion` is bumped here because a command is the whole of its own
 * transition — the reducer records history off that number and re-derives the box
 * afterwards, finding it already grown from the drawn corner (rewriteTableGrid).
 */
const createTableInsertCommand = (spec: TableInsertCommandSpec): Command => ({
	id: spec.id,
	label: spec.label,
	category: "edit",
	shortcuts: { default: [toKeyBinding(spec)] },

	canExecute: (state) =>
		resolveTableInsertTarget(state, spec.axis, spec.side) !== null,

	execute: (state) => {
		const target = resolveTableInsertTarget(state, spec.axis, spec.side);
		if (target === null) {
			return state;
		}
		const inserted = insertTableTrack(target.table, spec.axis, target.at);
		return {
			...state,
			objects: { ...state.objects, [target.objectId]: inserted },
			objectPartSelection:
				state.objectPartSelection === null
					? null
					: remapTablePartSelectionForInsert(
							state.objectPartSelection,
							spec.axis,
							target.at,
						),
			commitVersion: state.commitVersion + 1,
		};
	},
});

/**
 * The table's command contributions, wired in through `CanvasPlugin.commands`:
 * insert a row above or below, a column left or right, relative to the row,
 * column or cell selection standing on the table.
 *
 * Insertion and removal are deliberately absent from the type's ObjectMenu — the
 * menu carries what styles a table, and reshaping the grid belongs to the keys,
 * the grips, the `+` badges and the right-click menu.
 */
export const TABLE_INSERT_COMMANDS: readonly Command[] =
	TABLE_INSERT_COMMAND_SPECS.map(createTableInsertCommand);
