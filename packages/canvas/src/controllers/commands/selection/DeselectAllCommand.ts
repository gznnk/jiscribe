import type { Command } from "../CommandTypes";

export const DeselectAllCommand: Command = {
	id: "deselectAll",
	label: "Deselect All",
	category: "selection",
	shortcuts: {
		mac: [{ code: "KeyA", meta: true, shift: true }, { code: "Escape" }],
		win: [{ code: "KeyA", ctrl: true, shift: true }, { code: "Escape" }],
		default: [{ code: "KeyA", ctrl: true, shift: true }, { code: "Escape" }],
	},

	canExecute: (state) => {
		// Disabled while dragging an object (any drag other than area selection)
		if (state.eventStartSnapshot !== null && state.areaSelection === null) {
			return false;
		}
		return (
			state.selectedIds.length > 0 ||
			state.selectedConnectorId !== null ||
			state.selectedVertex !== null ||
			state.areaSelection !== null ||
			state.shapeDrawing !== null
		);
	},

	execute: (state) => {
		return {
			...state,
			selectedIds: [],
			selectedConnectorId: null,
			// Without clearing it, an invisible vertex selection lingers and the Delete key deletes an unintended vertex
			selectedVertex: null,
			multiSelectGroup: null,
			areaSelection: null,
			objectMenuOpenId: null,
			edgeScrollEnabled: false,
			shapeDrawing: null,
		};
	},
};
