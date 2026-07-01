import { createMultiSelectGroup } from "../../utils/createMultiSelectGroup";
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
			// selectedIds is mutually exclusive with selectedConnectorId / selectedVertex.
			// Without clearing them, the branching in SwapArrows and handlePropertyUpdate breaks.
			selectedConnectorId: null,
			selectedVertex: null,
			objectMenuOpenId: null,
		};
	},
};
