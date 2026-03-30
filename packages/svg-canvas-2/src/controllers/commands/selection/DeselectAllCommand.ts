import type { Command } from "../CommandTypes";

export const DeselectAllCommand: Command = {
	id: "deselectAll",
	label: "選択解除",
	category: "selection",
	shortcuts: {
		mac: [{ key: "a", meta: true, shift: true }],
		win: [{ key: "a", ctrl: true, shift: true }],
		default: [{ key: "a", ctrl: true, shift: true }],
	},

	canExecute: (state) => {
		return state.selectedIds.length > 0;
	},

	execute: (state) => {
		return {
			...state,
			selectedIds: [],
		};
	},
};
