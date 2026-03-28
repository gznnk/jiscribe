import type { Command } from "../CommandTypes";

export const DeselectAllCommand: Command = {
	id: "deselectAll",
	label: "選択解除",
	category: "selection",
	shortcuts: [
		{ key: "a", ctrl: true, shift: true },
		{ key: "a", meta: true, shift: true }, // Mac用
	],

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
