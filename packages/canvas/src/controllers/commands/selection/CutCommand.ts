import { CopyCommand } from "./CopyCommand";
import { DeleteCommand } from "./DeleteCommand";
import { getSelectedConnectorId } from "../../utils/getSelectedConnectorId";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Cut command: copies the current selection to the clipboard and then deletes it.
 * Composes CopyCommand and DeleteCommand.
 */
export const CutCommand: ExecutableCommand = {
	id: "cut",
	label: { en: "Cut", ja: "切り取り" },
	category: "edit",
	shortcuts: {
		mac: [{ code: "KeyX", meta: true }],
		win: [{ code: "KeyX", ctrl: true }],
		default: [{ code: "KeyX", ctrl: true }],
	},

	// Offered where Copy is, which it composes: not for a lone connector.
	canExecute: (state) =>
		state.selectedIds.length > 0 && getSelectedConnectorId(state) === null,

	execute: (state, registries) => {
		// Drop the part selection before composing. Otherwise CopyCommand copies the
		// entire polyline while DeleteCommand deletes only a single vertex, producing
		// an asymmetric result.
		const stateWithClipboard = CopyCommand.execute(
			{
				...state,
				objectPartSelection: null,
			},
			registries,
		);
		return DeleteCommand.execute(stateWithClipboard, registries);
	},
};
