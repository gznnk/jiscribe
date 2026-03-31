import type { Command } from "../CommandTypes";

export const DeselectAllCommand: Command = {
	id: "deselectAll",
	label: "選択解除",
	category: "selection",
	shortcuts: {
		mac: [{ key: "a", meta: true, shift: true }, { key: "Escape" }],
		win: [{ key: "a", ctrl: true, shift: true }, { key: "Escape" }],
		default: [{ key: "a", ctrl: true, shift: true }, { key: "Escape" }],
	},

	canExecute: (state) => {
		return state.selectedIds.length > 0 || state.areaSelection !== null;
	},

	execute: (state) => {
		return {
			...state,
			selectedIds: [],
			areaSelection: null,
		};
	},
};
