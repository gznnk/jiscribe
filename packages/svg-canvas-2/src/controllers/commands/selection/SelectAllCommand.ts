import { createMultiSelectGroup } from "../../gestures/handlers/objects/utils/createMultiSelectGroup";
import type { Command } from "../CommandTypes";

export const SelectAllCommand: Command = {
	id: "selectAll",
	label: "すべて選択",
	category: "selection",
	shortcuts: {
		mac: [{ key: "a", meta: true }],
		win: [{ key: "a", ctrl: true }],
		default: [{ key: "a", ctrl: true }],
	},

	canExecute: (state) => {
		return state.rootIds.length > 0;
	},

	execute: (state) => {
		return {
			...state,
			selectedIds: [...state.rootIds],
			multiSelectGroup: createMultiSelectGroup(
				state.rootIds,
				state.objects,
				state.multiSelectGroup,
			),
		};
	},
};
