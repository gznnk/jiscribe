import {
	clearAllSelection,
	isSelectionClearable,
} from "./utils/clearAllSelection";
import { resolveObjectPartSelection } from "../../selection/resolveObjectPartSelection";
import type { ExecutableCommand } from "../CommandTypes";

export const EscapeSelectionCommand: ExecutableCommand = {
	id: "escapeSelection",
	label: { en: "Escape Selection", ja: "選択を1段戻す" },
	category: "selection",
	shortcuts: {
		default: [{ code: "Escape" }],
	},

	canExecute: isSelectionClearable,

	execute: (state, registries) => {
		// Escape steps out one level at a time: a live slot selection is dropped
		// first, leaving the object it belongs to selected. The step changes what the
		// menu acts on, so an open submenu closes with it (clearAllSelection does the
		// same on the step after).
		if (resolveObjectPartSelection(state, registries.objectPart) !== null) {
			return { ...state, objectPartSelection: null, objectMenuOpenId: null };
		}
		return clearAllSelection(state);
	},
};
