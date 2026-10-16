import { commitEdit, TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import type { Command, KeyBinding, LocaleMessages } from "@jiscribe/canvas-sdk";

import { readTableInsertTarget } from "./readTableInsertTarget";
import type { TableInsertSide } from "./readTableInsertTarget";
import { insertTableTrack } from "../grid/insertTableTrack";
import { remapTablePartSelectionForInsert } from "../grid/remapTablePartSelectionForInsert";
import {
	TABLE_COLUMN_PART_KIND,
	TABLE_ROW_PART_KIND,
} from "../grid/tableTrack";
import type { TableAxis } from "../grid/tableTrack";

/** The ids of the four insert commands, which a surface drawing them keys its own per-command data by. */
export type TableInsertCommandId =
	| "table.insertRowAbove"
	| "table.insertRowBelow"
	| "table.insertColumnLeft"
	| "table.insertColumnRight";

/** An insert command, its id narrowed to the four. */
export type TableInsertCommand = Command & { id: TableInsertCommandId };

/** One command's id, wording and key, per axis and side. */
type TableInsertCommandSpec = {
	axis: TableAxis;
	side: TableInsertSide;
	id: TableInsertCommandId;
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
 * afterwards, finding it already grown from the drawn corner (fitTableBoxToGrid).
 */
const createTableInsertCommand = (
	spec: TableInsertCommandSpec,
): TableInsertCommand => ({
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
		const inserted = insertTableTrack(
			target.table,
			spec.axis,
			target.at,
			target.besideIndex,
		);
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

/** The commands of one axis's specs, in spec order. */
const createTableInsertCommandsAlong = (
	axis: TableAxis,
): TableInsertCommand[] =>
	TABLE_INSERT_COMMAND_SPECS.filter((spec) => spec.axis === axis).map(
		createTableInsertCommand,
	);

/**
 * The insertions along each axis, `"before"` first: what the properties sidebar
 * (TableInsertProperty) and the ObjectMenu (TableInsertMenu) offer for a picked
 * row, column or cell.
 */
export const TABLE_INSERT_COMMANDS_BY_AXIS: Readonly<
	Record<TableAxis, readonly TableInsertCommand[]>
> = {
	row: createTableInsertCommandsAlong("row"),
	column: createTableInsertCommandsAlong("column"),
};

/**
 * The axes offered per picked part kind: a row names no column to insert beside
 * and a column no row (readTableTrackTarget), where a cell names both. Its keys
 * are the kinds the Insert items are kept under while a pick narrows the
 * sidebar and the ObjectMenu.
 */
export const TABLE_INSERT_AXES_BY_PICKED_PART_KIND: Readonly<
	Record<string, readonly TableAxis[]>
> = {
	[TABLE_ROW_PART_KIND]: ["row"],
	[TABLE_COLUMN_PART_KIND]: ["column"],
	[TEXT_SLOT_PART_KIND]: ["row", "column"],
};

/** The `pickedPartKinds` the Insert items declare, read off the table above. */
export const TABLE_INSERT_PICKED_PART_KINDS: readonly string[] = Object.keys(
	TABLE_INSERT_AXES_BY_PICKED_PART_KIND,
);

/**
 * The table's command contributions, wired in through `CanvasPlugin.commands`:
 * insert a row above or below, a column left or right, relative to the row,
 * column or cell selection standing on the table.
 *
 * Besides the keys, they are offered as buttons while a row, column or cell is
 * picked, in the properties sidebar's Insert section and the ObjectMenu's. Removal has no command at all: Delete over a picked row or column
 * takes it (the part definitions' `delete`).
 */
export const TABLE_INSERT_COMMANDS: readonly TableInsertCommand[] = [
	...TABLE_INSERT_COMMANDS_BY_AXIS.row,
	...TABLE_INSERT_COMMANDS_BY_AXIS.column,
];
