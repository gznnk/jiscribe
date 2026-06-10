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
			// 解除しないと不可視の頂点選択が残り、Delete キーで意図しない頂点削除が起きる
			selectedVertex: null,
			multiSelectGroup: null,
			areaSelection: null,
			objectMenuOpenId: null,
			edgeScrollEnabled: false,
			shapeDrawing: null,
		};
	},
};
