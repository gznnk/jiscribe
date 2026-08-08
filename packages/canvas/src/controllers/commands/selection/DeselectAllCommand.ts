import type { ExecutableCommand } from "../CommandTypes";
import {
	clearAllSelection,
	isSelectionClearable,
} from "./utils/clearAllSelection";

export const DeselectAllCommand: ExecutableCommand = {
	id: "deselectAll",
	label: "Deselect All",
	category: "selection",
	shortcuts: {
		mac: [{ code: "KeyA", meta: true, shift: true }],
		win: [{ code: "KeyA", ctrl: true, shift: true }],
		default: [{ code: "KeyA", ctrl: true, shift: true }],
	},

	canExecute: isSelectionClearable,

	// Unlike Escape (EscapeSelectionCommand), this clears in one press with no
	// intermediate step: an explicit "deselect all" is not a step outward.
	execute: clearAllSelection,
};
