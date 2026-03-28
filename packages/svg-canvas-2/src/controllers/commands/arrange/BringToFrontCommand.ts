import type { Command } from "../CommandTypes";

export const BringToFrontCommand: Command = {
	id: "bringToFront",
	label: "最前面へ移動",
	category: "arrange",
	shortcuts: [
		{ key: "]", ctrl: true, shift: true },
		{ key: "]", meta: true, shift: true }, // Mac用
	],

	canExecute: (state) => {
		return state.selectedIds.length > 0;
	},

	execute: (state) => {
		const updatedRootIds = state.rootIds.filter(
			(id) => !state.selectedIds.includes(id),
		);
		// 選択オブジェクトを最後（最前面）に追加
		updatedRootIds.push(...state.selectedIds);

		return {
			...state,
			rootIds: updatedRootIds,
			lastCommitTime: Date.now(),
		};
	},
};
