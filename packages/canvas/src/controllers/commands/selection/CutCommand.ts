import { CopyCommand } from "./CopyCommand";
import { DeleteCommand } from "./DeleteCommand";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Cut command: copies the current selection to the clipboard and then deletes it.
 * Composes CopyCommand and DeleteCommand.
 */
export const CutCommand: ExecutableCommand = {
	id: "cut",
	label: "Cut",
	category: "edit",
	shortcuts: {
		mac: [{ code: "KeyX", meta: true }],
		win: [{ code: "KeyX", ctrl: true }],
		default: [{ code: "KeyX", ctrl: true }],
	},

	canExecute: (state) => state.selectedIds.length > 0,

	execute: (state, registries) => {
		// Clear selectedVertex before composing.
		// Otherwise CopyCommand copies the entire polyline while DeleteCommand
		// deletes only a single vertex, producing an asymmetric result.
		const stateWithClipboard = CopyCommand.execute(
			{
				...state,
				selectedVertex: null,
			},
			registries,
		);
		return DeleteCommand.execute(stateWithClipboard, registries);
	},
};
