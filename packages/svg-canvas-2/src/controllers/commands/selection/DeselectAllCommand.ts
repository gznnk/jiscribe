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
		// オブジェクトドラッグ中（範囲選択以外のドラッグ）は無効化
		if (state.eventStartSnapshot !== null && state.areaSelection === null) {
			return false;
		}
		return (
			state.selectedIds.length > 0 ||
			state.selectedConnectorId !== null ||
			state.areaSelection !== null ||
			state.shapeDrawing !== null
		);
	},

	execute: (state) => {
		return {
			...state,
			selectedIds: [],
			selectedConnectorId: null,
			areaSelection: null,
			objectMenuOpenId: null,
			edgeScrollEnabled: false,
			shapeDrawing: null,
		};
	},
};
