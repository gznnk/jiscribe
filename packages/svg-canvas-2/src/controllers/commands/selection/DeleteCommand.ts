import type { Command } from "../CommandTypes";

export const DeleteCommand: Command = {
	id: "delete",
	label: "削除",
	category: "edit",
	shortcuts: [{ key: "Delete" }, { key: "Backspace" }],

	canExecute: (state) => {
		return state.selectedIds.length > 0;
	},

	execute: (state) => {
		const updatedObjects = { ...state.objects };
		const updatedRootIds = [...state.rootIds];

		// 選択オブジェクトを削除
		for (const id of state.selectedIds) {
			delete updatedObjects[id];
			const index = updatedRootIds.indexOf(id);
			if (index !== -1) {
				updatedRootIds.splice(index, 1);
			}
		}

		return {
			...state,
			objects: updatedObjects,
			rootIds: updatedRootIds,
			selectedIds: [],
			lastCommitTime: Date.now(), // コミット必要
		};
	},
};
