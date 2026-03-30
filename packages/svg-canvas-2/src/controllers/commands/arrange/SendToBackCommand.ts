import type { Command } from "../CommandTypes";

export const SendToBackCommand: Command = {
	id: "sendToBack",
	label: "最背面へ移動",
	category: "arrange",
	shortcuts: {
		mac: [{ key: "[", meta: true, shift: true }],
		win: [{ key: "[", ctrl: true, shift: true }],
		default: [{ key: "[", ctrl: true, shift: true }],
	},

	canExecute: (state) => {
		return state.selectedIds.length > 0;
	},

	execute: (state) => {
		const updatedRootIds = state.rootIds.filter(
			(id) => !state.selectedIds.includes(id),
		);
		// 選択オブジェクトを最初（最背面）に追加
		updatedRootIds.unshift(...state.selectedIds);

		return {
			...state,
			rootIds: updatedRootIds,
			lastCommitTime: Date.now(),
		};
	},
};
