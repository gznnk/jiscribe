import { isPoly } from "../../../schemas/objects/types/Poly";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { updateGroupBounds } from "../../ui/utils/updateGroupBounds";
import { cleanupConnectorsOnDelete } from "../../utils/cleanupConnectorsOnDelete";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";
import type { Command } from "../CommandTypes";

export const DeleteCommand: Command = {
	id: "delete",
	label: "Delete",
	category: "edit",
	shortcuts: {
		default: [{ key: "Delete" }, { key: "Backspace" }],
	},

	canExecute: (state) => {
		return (
			state.selectedVertex !== null ||
			state.selectedIds.length > 0 ||
			state.selectedConnectorId !== null
		);
	},

	execute: (state) => {
		// selectedVertex がある場合は頂点削除を優先する。
		// selectedIds にオブジェクトが残っていても、この分岐でリターンしてオブジェクト削除に落ちないようにする。
		if (state.selectedVertex !== null) {
			const { objectId, vertexIndex } = state.selectedVertex;
			const poly = state.objects[objectId];

			if (!isPoly(poly)) {
				return { ...state, selectedVertex: null };
			}

			const points = poly.points;
			const minPoints = poly.type === "polygon" ? 3 : 2;

			// 最小頂点数以下は削除しない
			if (points.length <= minPoints) {
				return state;
			}

			const newPoints = points.filter((_, i) => i !== vertexIndex);
			const updatedPoly = { ...poly, points: newPoints };

			let nextState: CanvasControllerState = {
				...state,
				objects: {
					...state.objects,
					[objectId]: updatedPoly,
				},
				selectedVertex: null,
				lastCommitTime: Date.now(),
			};

			if (updatedPoly.parentId) {
				nextState = updateGroupBoundsFromRoot(nextState, updatedPoly.parentId);
			}

			return nextState;
		}

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

		// 選択中のコネクターも削除対象に追加
		if (state.selectedConnectorId != null) {
			idsToDelete.add(state.selectedConnectorId);
		}

		// コネクターの整理（削除前の状態で座標解決するため先に実行）
		const stateAfterConnectors = cleanupConnectorsOnDelete(state, idsToDelete);

		const updatedObjects = { ...stateAfterConnectors.objects };

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

					// Update parent's bounds after child removal
					const updatedParent = updateGroupBounds(updatedObjects, obj.parentId);
					if (updatedParent) {
						updatedObjects[obj.parentId] = updatedParent;
					}
				}
			}
		}

		const nextStateBeforeCleanup = {
			...state,
			objects: updatedObjects,
			rootIds: state.rootIds.filter((id) => !idsToDelete.has(id)),
			connectorIds: stateAfterConnectors.connectorIds.filter(
				(id) => !idsToDelete.has(id),
			),
			selectedIds: [] as string[],
			selectedConnectorId: null,
			objectMenuOpenId: null,
			lastCommitTime: Date.now(), // コミット必要
		};

		// グループのクリーンアップ（空グループの削除、1個グループの解除）
		return cleanupGroups(nextStateBeforeCleanup);
	},
};
