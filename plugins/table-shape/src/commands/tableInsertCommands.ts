import { commitEdit } from "@jiscribe/canvas-sdk";
import type { Command, KeyBinding, LocaleMessages } from "@jiscribe/canvas-sdk";

import { readTableInsertTarget } from "./readTableInsertTarget";
import type { TableInsertSide } from "./readTableInsertTarget";
import { insertTableTrack } from "../grid/insertTableTrack";
import { remapTablePartSelectionForInsert } from "../grid/remapTablePartSelectionForInsert";
import type { TableAxis } from "../grid/tableTrack";

/** One command's id, wording and key, per axis and side. */
type TableInsertCommandSpec = {
	axis: TableAxis;
	side: TableInsertSide;
	id: string;
	/**
	 * Wording, per locale. It names the track and the side it appears on rather
	 * than the act on the selection ("Insert Row Above", not "Insert Above"): a
	 * label is read away from the table, with no grip or cell in view to say which
	 * axis is meant.
	 */
	label: LocaleMessages<string>;
	/** The arrow the new track appears in the direction of. */
	arrowCode: string;
};

/**
 * The four insertions. The ids are namespaced because the registry refuses a
 * second command under an id already taken, built-in or contributed
 * (CommandRegistry.register).
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
		label: { en: "Insert Row Above", ja: "上に行を挿入" },
		arrowCode: "ArrowUp",
	},
	{
		axis: "row",
		side: "after",
		id: "table.insertRowBelow",
		label: { en: "Insert Row Below", ja: "下に行を挿入" },
		arrowCode: "ArrowDown",
	},
	{
		axis: "column",
		side: "before",
		id: "table.insertColumnLeft",
		label: { en: "Insert Column Left", ja: "左に列を挿入" },
		arrowCode: "ArrowLeft",
	},
	{
		axis: "column",
		side: "after",
		id: "table.insertColumnRight",
		label: { en: "Insert Column Right", ja: "右に列を挿入" },
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
 * The command commits its own edit (commitEdit): the reducer's COMMAND path
 * records history off `commitVersion` without advancing it, and re-derives the box
 * afterwards, finding it already grown from the drawn corner (rewriteTableGrid).
 */
const createTableInsertCommand = (spec: TableInsertCommandSpec): Command => ({
	id: spec.id,
	label: spec.label,
	category: "edit",
	shortcuts: { default: [toKeyBinding(spec)] },

	canExecute: (state, registries) =>
		readTableInsertTarget(
			state,
			spec.axis,
			spec.side,
			registries.objectPartKind,
		) !== null,

	execute: (state, registries) => {
		const target = readTableInsertTarget(
			state,
			spec.axis,
			spec.side,
			registries.objectPartKind,
		);
		if (target === null) {
			return state;
		}
		const inserted = insertTableTrack(target.table, spec.axis, target.at);
		return commitEdit({
			...state,
			objects: { ...state.objects, [target.objectId]: inserted },
			selection: {
				...state.selection,
				part:
					state.selection.part === null
						? null
						: remapTablePartSelectionForInsert(
								state.selection.part,
								spec.axis,
								target.at,
							),
			},
		});
	},
});

/**
 * The table's command contributions, wired in through `CanvasPlugin.commands`:
 * insert a row above or below, a column left or right, relative to the row,
 * column or cell selection standing on the table.
 *
 * Insertion is deliberately absent from the type's ObjectMenu — the menu carries
 * what styles a table, and reshaping the grid belongs to the keys, the grips and
 * the `+` badges. Removal has no command at all: Delete over a picked row or
 * column takes it (the part definitions' `delete`).
 */
export const TABLE_INSERT_COMMANDS: readonly Command[] =
	TABLE_INSERT_COMMAND_SPECS.map(createTableInsertCommand);
