import type {
	ContextMenuContribution,
	ContextMenuItem,
} from "@jiscribe/canvas";
import type { Command } from "@jiscribe/canvas-sdk";

import { TABLE_INSERT_COMMANDS } from "./tableInsertCommands";
import { TABLE_REMOVE_COMMANDS } from "./tableRemoveCommands";

/** The commands themselves as rows, so a renamed id cannot leave a row undrawn. */
const toMenuItems = (commands: readonly Command[]): ContextMenuItem[] =>
	commands.map((command) => ({ type: "command", commandId: command.id }));

/**
 * The rows a right-click on a table adds, and the table's only surface for
 * reshaping the grid by pointing: the insertions and the removals are absent
 * from the ObjectMenu, which carries what styles a table.
 *
 * **Before the built-in block.** These are the only rows in the menu that are
 * about the thing under the cursor, and the only way to reach these commands
 * without knowing their keys — where cut, copy and delete are reachable from
 * keys everyone already has. Coming first also fixes the block's position, where
 * coming last would move it every time the built-in set grows.
 *
 * A right-click changes no selection, so what these rows offer is what is
 * executable for the selection already standing: with the table picked but no
 * cell or track, every one of them draws disabled rather than silently doing
 * nothing (ContextMenu reads `canExecute`).
 *
 * The trailing separator is the divider from the built-in block — a contribution
 * is spliced verbatim, so a type wanting one states it.
 */
export const TABLE_CONTEXT_MENU: ContextMenuContribution = {
	placement: "before",
	items: [
		...toMenuItems(TABLE_INSERT_COMMANDS),
		{ type: "separator" },
		...toMenuItems(TABLE_REMOVE_COMMANDS),
		{ type: "separator" },
	],
};
