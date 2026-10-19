import type { CanvasSelection } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import type { LocaleMessages } from "@jiscribe/canvas-sdk";

import { ER_ENTITY_INSERT_COMMANDS } from "../commands/erEntityColumnCommands";
import type {
	ErEntityInsertCommand,
	ErEntityInsertCommandId,
} from "../commands/erEntityColumnCommands";
import { ER_ENTITY_COLUMN_PART_KIND } from "../parts/erEntityColumnPartKind";
import { ER_ENTITY_NAME_TEXT_SLOT_ID } from "../schema/ErEntityDoc";

/**
 * The words each insertion's button is labelled with. Shorter than the command's
 * own label: on a button the column section and the pick already say a column is
 * meant.
 */
export const ER_ENTITY_INSERT_BUTTON_LABELS: Readonly<
	Record<ErEntityInsertCommandId, LocaleMessages<string>>
> = {
	"erEntity.insertColumnAbove": { en: "Add Above", ja: "上に追加" },
	"erEntity.insertColumnBelow": { en: "Add Below", ja: "下に追加" },
	"erEntity.appendColumn": { en: "Add at Bottom", ja: "一番下に追加" },
};

/** The part kinds the column items are kept under while a pick narrows the menu and the sidebar. */
export const ER_ENTITY_INSERT_PICKED_PART_KINDS: readonly string[] = [
	ER_ENTITY_COLUMN_PART_KIND,
	TEXT_SLOT_PART_KIND,
];

/** The insertion of one id, looked up once; every id is declared by ER_ENTITY_INSERT_COMMANDS. */
const findInsertCommand = (
	commandId: ErEntityInsertCommandId,
): ErEntityInsertCommand => {
	const command = ER_ENTITY_INSERT_COMMANDS.find(
		(candidate) => candidate.id === commandId,
	);
	if (command === undefined) {
		throw new Error(`no erEntity insertion "${commandId}"`);
	}
	return command;
};

const INSERT_ABOVE_COMMAND = findInsertCommand("erEntity.insertColumnAbove");
const INSERT_BELOW_COMMAND = findInsertCommand("erEntity.insertColumnBelow");
const APPEND_COMMAND = findInsertCommand("erEntity.appendColumn");

/** Whether a slot pick stays on the title alone, which names no column to insert beside. */
const isTitleOnlyPick = (selection: CanvasSelection): boolean =>
	selection.part?.ranges.every(
		(range) =>
			range.anchorId === ER_ENTITY_NAME_TEXT_SLOT_ID &&
			range.focusId === ER_ENTITY_NAME_TEXT_SLOT_ID,
	) ?? false;

/**
 * Which insertions the column section offers for a selection: above and below
 * a picked column or column slot, at the bottom for the entity selected as a
 * whole, nothing otherwise. A reading of the selection alone, where the
 * commands' `canExecute` reads the canvas; the two agree on everything a menu
 * can be drawn for (a sole entity, no editor open).
 *
 * @param selection - The canvas selection the surface was handed
 * @returns The commands in the order the buttons are drawn; empty for several objects, the title slot picked alone, or a kind of pick that names no column
 */
export const readOfferedErEntityInsertCommands = (
	selection: CanvasSelection,
): readonly ErEntityInsertCommand[] => {
	if (selection.objectIds.length !== 1) {
		return [];
	}
	const { part } = selection;
	if (part === null) {
		return [APPEND_COMMAND];
	}
	const namesColumn =
		part.kind === ER_ENTITY_COLUMN_PART_KIND ||
		(part.kind === TEXT_SLOT_PART_KIND && !isTitleOnlyPick(selection));
	return namesColumn ? [INSERT_ABOVE_COMMAND, INSERT_BELOW_COMMAND] : [];
};
