import type { GroupState } from "../../../states/objects/primitives/GroupState";
import type { Command } from "../CommandTypes";

export const DeleteCommand: Command = {
	id: "delete",
	label: "削除",
	category: "edit",
	shortcuts: {
		default: [{ key: "Delete" }, { key: "Backspace" }],
	},

	canExecute: (state) => {
		return state.selectedIds.length > 0;
	},

	execute: (state) => {
		// 削除対象IDを収集（グループの場合は子孫も再帰的に含める）
		const idsToDelete = new Set<string>();

		const collectIds = (id: string) => {
			if (idsToDelete.has(id)) return;
			idsToDelete.add(id);
			const obj = state.objects[id];
			if (obj?.type === "group") {
				for (const childId of (obj as GroupState).childIds) {
					collectIds(childId);
				}
			}
		};

		for (const id of state.selectedIds) {
			collectIds(id);
		}

		const updatedObjects = { ...state.objects };

		// 削除対象オブジェクトを objects から除去
		for (const id of idsToDelete) {
			delete updatedObjects[id];
		}

		// 選択オブジェクトのうち、親が削除されない場合は親の childIds から除去
		for (const id of state.selectedIds) {
			const obj = state.objects[id];
			if (obj?.parentId != null && !idsToDelete.has(obj.parentId)) {
				const parent = updatedObjects[obj.parentId];
				if (parent?.type === "group") {
					const groupParent = parent as GroupState;
					updatedObjects[obj.parentId] = {
						...groupParent,
						childIds: groupParent.childIds.filter((childId) => childId !== id),
					} as GroupState;
				}
			}
		}

		return {
			...state,
			objects: updatedObjects,
			rootIds: state.rootIds.filter((id) => !idsToDelete.has(id)),
			connectorIds: state.connectorIds.filter((id) => !idsToDelete.has(id)),
			selectedIds: [],
			lastCommitTime: Date.now(), // コミット必要
		};
	},
};
