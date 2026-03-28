import type { Command } from "../CommandTypes";

export const SelectAllCommand: Command = {
	id: "selectAll",
	label: "すべて選択",
	category: "selection",
	shortcuts: [
		{ key: "a", ctrl: true },
		{ key: "a", meta: true }, // Mac用
	],

	canExecute: (state) => {
		return state.rootIds.length > 0;
	},

	execute: (state) => {
		return {
			...state,
			selectedIds: [...state.rootIds],
		};
	},
};
