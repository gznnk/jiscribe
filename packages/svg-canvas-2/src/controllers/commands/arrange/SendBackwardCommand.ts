import type { Command } from "../CommandTypes";

export const SendBackwardCommand: Command = {
	id: "sendBackward",
	label: "背面へ移動",
	category: "arrange",
	shortcuts: [
		{ key: "[", ctrl: true },
		{ key: "[", meta: true }, // Mac用
	],

	canExecute: (state) => {
		return state.selectedIds.length > 0;
	},

	execute: (state) => {
		const updatedRootIds = [...state.rootIds];

		// 前から処理して、1つ後ろに移動
		for (let i = 1; i < updatedRootIds.length; i++) {
			const id = updatedRootIds[i];
			if (
				state.selectedIds.includes(id) &&
				!state.selectedIds.includes(updatedRootIds[i - 1])
			) {
				// 選択されていて、前が選択されていない場合は入れ替え
				[updatedRootIds[i - 1], updatedRootIds[i]] = [
					updatedRootIds[i],
					updatedRootIds[i - 1],
				];
			}
		}

		return {
			...state,
			rootIds: updatedRootIds,
			lastCommitTime: Date.now(),
		};
	},
};
