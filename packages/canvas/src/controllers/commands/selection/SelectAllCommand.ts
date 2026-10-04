import { isConnectorState } from "../../../states/objects/connector/ConnectorState";
import { createMultiSelectGroup } from "../../utils/createMultiSelectGroup";
import type { ExecutableCommand } from "../CommandTypes";

export const SelectAllCommand: ExecutableCommand = {
	id: "selectAll",
	label: { en: "Select All", ja: "すべて選択" },
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
		// Connectors are mixed into rootIds but are only ever selected on their own,
		// so Select All leaves them out (otherwise Group would grab them). Paste
		// applies the same filter (handlePaste).
		const selectableIds = state.rootIds.filter(
			(id) => !isConnectorState(state.objects[id]),
		);

		return {
			...state,
			selectedIds: selectableIds,
			multiSelectGroup: createMultiSelectGroup(
				selectableIds,
				state.objects,
				state.multiSelectGroup,
			),
			objectMenuOpenId: null,
			stencilLibraryOpenCategory: null,
		};
	},
};
