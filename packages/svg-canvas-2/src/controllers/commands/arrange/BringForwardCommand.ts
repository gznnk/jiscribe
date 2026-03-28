import type { Command } from "../CommandTypes";

export const BringForwardCommand: Command = {
	id: "bringForward",
	label: "前面へ移動",
	category: "arrange",
	shortcuts: [
		{ key: "]", ctrl: true },
		{ key: "]", meta: true }, // Mac用
	],

	canExecute: (state) => {
		return state.selectedIds.length > 0;
	},

	execute: (state) => {
		const updatedRootIds = [...state.rootIds];

		// 後ろから処理して、1つ前に移動
		for (let i = updatedRootIds.length - 2; i >= 0; i--) {
			const id = updatedRootIds[i];
			if (
				state.selectedIds.includes(id) &&
				!state.selectedIds.includes(updatedRootIds[i + 1])
			) {
				// 選択されていて、次が選択されていない場合は入れ替え
				[updatedRootIds[i], updatedRootIds[i + 1]] = [
					updatedRootIds[i + 1],
					updatedRootIds[i],
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
