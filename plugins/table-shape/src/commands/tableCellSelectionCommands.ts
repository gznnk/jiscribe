import type { Command, LocaleMessages } from "@jiscribe/canvas-sdk";

import {
	canSelectAdjacentTableCell,
	selectAdjacentTableCell,
} from "./selectAdjacentTableCell";
import type { TableCellStepDirection } from "./selectAdjacentTableCell";

/** One step command's id, wording and key. */
type TableCellSelectionCommandSpec = {
	direction: TableCellStepDirection;
	id: string;
	label: LocaleMessages<string>;
	/** The bare arrow the command answers to, the one pointing the way it steps. */
	arrowCode: string;
};

const TABLE_CELL_SELECTION_COMMAND_SPECS: readonly TableCellSelectionCommandSpec[] =
	[
		{
			direction: "up",
			id: "table.selectCellUp",
			label: { en: "Select Cell Above", ja: "上のセルを選択" },
			arrowCode: "ArrowUp",
		},
		{
			direction: "down",
			id: "table.selectCellDown",
			label: { en: "Select Cell Below", ja: "下のセルを選択" },
			arrowCode: "ArrowDown",
		},
		{
			direction: "left",
			id: "table.selectCellLeft",
			label: { en: "Select Cell Left", ja: "左のセルを選択" },
			arrowCode: "ArrowLeft",
		},
		{
			direction: "right",
			id: "table.selectCellRight",
			label: { en: "Select Cell Right", ja: "右のセルを選択" },
			arrowCode: "ArrowRight",
		},
	];

/**
 * Builds one step command. It shares its bare arrow with the built-in nudge and
 * takes the key from it because a contributed command is offered a keystroke
 * first (CommandRegistry.findAllByShortcut), which is why `canExecute` stays true
 * at the grid's edge: answering false there would hand the key to the nudge and
 * move the whole table.
 */
const createTableCellSelectionCommand = (
	spec: TableCellSelectionCommandSpec,
): Command => ({
	id: spec.id,
	label: spec.label,
	category: "selection",
	shortcuts: { default: [{ code: spec.arrowCode }] },
	canExecute: (state) => canSelectAdjacentTableCell(state),
	execute: (state) => selectAdjacentTableCell(state, spec.direction),
});

/**
 * The table's cell-stepping commands, wired in through `CanvasPlugin.commands`:
 * the bare arrows move a cell pick one cell up, down, left or right. Only a cell
 * pick claims them; a whole table, a row or column pick and every other shape
 * leave the arrows to the built-in nudge.
 */
export const TABLE_CELL_SELECTION_COMMANDS: readonly Command[] =
	TABLE_CELL_SELECTION_COMMAND_SPECS.map(createTableCellSelectionCommand);
