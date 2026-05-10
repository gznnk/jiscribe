import type { Command } from "../CommandTypes";

export const DeselectAllCommand: Command = {
	id: "deselectAll",
	label: "選択解除",
	category: "selection",
	shortcuts: {
		mac: [{ key: "a", meta: true, shift: true }, { key: "Escape" }],
		win: [{ key: "a", ctrl: true, shift: true }, { key: "Escape" }],
		default: [{ key: "a", ctrl: true, shift: true }, { key: "Escape" }],
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
