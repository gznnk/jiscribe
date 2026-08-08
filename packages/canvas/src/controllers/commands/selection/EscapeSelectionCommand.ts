import {
	clearAllSelection,
	isSelectionClearable,
} from "./utils/clearAllSelection";
import { resolveSelectedTextSlot } from "../../utils/resolveSelectedTextSlot";
import type { ExecutableCommand } from "../CommandTypes";

export const EscapeSelectionCommand: ExecutableCommand = {
	id: "escapeSelection",
	label: "Escape Selection",
	category: "selection",
	shortcuts: {
		default: [{ code: "Escape" }],
	},

	canExecute: isSelectionClearable,

	execute: (state) => {
		// Escape steps out one level at a time: a live slot selection is dropped
		// first, leaving the object it belongs to selected.
		if (resolveSelectedTextSlot(state) !== null) {
			return { ...state, selectedTextSlot: null };
		}
		return clearAllSelection(state);
	},
};
