import { createMultiSelectGroup } from "../../gestures/handlers/objects/utils/createMultiSelectGroup";
import type { Command } from "../CommandTypes";

export const SelectAllCommand: Command = {
	id: "selectAll",
	label: "Select All",
	category: "selection",
	shortcuts: {
		mac: [{ code: "KeyA", meta: true }],
		win: [{ code: "KeyA", ctrl: true }],
		default: [{ code: "KeyA", ctrl: true }],
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
			// selectedIds と selectedConnectorId / selectedVertex は排他。
			// 解除しないと SwapArrows や handlePropertyUpdate の分岐が崩れる
			selectedConnectorId: null,
			selectedVertex: null,
			objectMenuOpenId: null,
		};
	},
};
