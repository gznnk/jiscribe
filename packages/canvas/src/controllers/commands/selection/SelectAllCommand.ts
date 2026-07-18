import { isConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import { createMultiSelectGroup } from "../../utils/createMultiSelectGroup";
import type { ExecutableCommand } from "../CommandTypes";

export const SelectAllCommand: ExecutableCommand = {
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
		// Connectors are mixed into rootIds but belong to the separate selectedConnectorId
		// channel; they must never enter selectedIds (otherwise Group would grab them).
		// Paste already applies this same filter (handlePaste), so Select All matches it.
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
			// selectedIds is mutually exclusive with selectedConnectorId / selectedVertex.
			// Without clearing them, the branching in SwapArrows and the style-property handlers breaks.
			selectedConnectorId: null,
			selectedVertex: null,
			objectMenuOpenId: null,
			shapeLibraryOpenCategory: null,
		};
	},
};
