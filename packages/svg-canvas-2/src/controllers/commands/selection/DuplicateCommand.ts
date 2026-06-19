import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createMultiSelectGroup } from "../../gestures/handlers/objects/utils/createMultiSelectGroup";
import { cloneObjects } from "../../reducer/handlers/cloneObjects";
import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";
import type { Command } from "../CommandTypes";
import { computeDuplicateOffset } from "./utils/computeDuplicateOffset";
import { getSelectionCenter } from "./utils/getSelectionCenter";
import { selectConnectorsInSelection } from "./utils/selectConnectorsInSelection";

export const DuplicateCommand: Command = {
	id: "duplicate",
	label: "Duplicate",
	category: "edit",
	shortcuts: {
		mac: [{ code: "KeyD", meta: true }],
		win: [{ code: "KeyD", ctrl: true }],
		default: [{ code: "KeyD", ctrl: true }],
	},

	canExecute: (state) => state.selectedIds.length > 0,

	execute: (state) => {
		const { selectedIds } = state;

		// ── 1. 複製対象オブジェクトの収集 ─────────────────────────────────────
		const selectedIdsWithDescendants = buildSelectedIdsWithDescendants(
			selectedIds,
			state.objects,
		);

		const allObjects: Record<string, ObjectState> = {};
		for (const id of selectedIdsWithDescendants) {
			const obj = state.objects[id];
			if (obj) {
				allObjects[id] = obj;
			}
		}

		// 両端点が選択範囲内のコネクターのみ複製（CopyCommand と同じ判定）
		const connectorIds = selectConnectorsInSelection(
			state.connectorIds,
			state.objects,
			selectedIdsWithDescendants,
		);
		for (const connId of connectorIds) {
			allObjects[connId] = state.objects[connId];
		}

		// ── 2. 配置先グループの判定 ───────────────────────────────────────────
		// 全選択オブジェクトが同一の parentId を持つ場合はその親グループ内に複製する。
		// parentId が undefined（ルートレベル）の場合は null として扱う。
		const firstParentId = state.objects[selectedIds[0]]?.parentId;
		const allSameParent = selectedIds.every(
			(id) => state.objects[id]?.parentId === firstParentId,
		);
		// targetGroupId: string → グループ内複製, null → ルート複製
		const targetGroupId: string | null =
			allSameParent && firstParentId != null ? firstParentId : null;

		// ── 3. オフセット計算（move-aware）────────────────────────────────────
		const offset = computeDuplicateOffset(state);

		// ── 4. オブジェクトの複製 ─────────────────────────────────────────────
		const { newObjects, newRootIds, newConnectorIds } = cloneObjects(
			selectedIds,
			allObjects,
			connectorIds,
			offset,
		);

		const mergedObjects = { ...state.objects, ...newObjects };

		// ── 5. 配置先グループへの組み込み ────────────────────────────────────
		let updatedRootIds = state.rootIds;

		if (targetGroupId !== null) {
			// グループ内複製: parentId を共通親グループに設定
			for (const newId of newRootIds) {
				mergedObjects[newId] = {
					...mergedObjects[newId],
					parentId: targetGroupId,
				};
			}

			// 親グループの childIds に新オブジェクトを挿入（選択の最後の位置の直後）
			const parentGroup = mergedObjects[targetGroupId] as GroupState;
			const childIds = [...parentGroup.childIds];
			const selectedSet = new Set(selectedIds);
			const lastSelectedIndex = childIds.reduce(
				(max, id, i) => (selectedSet.has(id) ? i : max),
				-1,
			);
			childIds.splice(lastSelectedIndex + 1, 0, ...newRootIds);
			mergedObjects[targetGroupId] = {
				...parentGroup,
				childIds,
			} as GroupState;
		} else {
			// ルート複製: rootIds に追加
			updatedRootIds = [...state.rootIds, ...newRootIds];
		}

		// ── 6. 状態を組み立て ─────────────────────────────────────────────────
		let nextState: CanvasControllerState = {
			...state,
			objects: mergedObjects,
			rootIds: updatedRootIds,
			connectorIds: [...state.connectorIds, ...newConnectorIds],
			selectedIds: newRootIds,
			multiSelectGroup: createMultiSelectGroup(newRootIds, mergedObjects, null),
			commitVersion: state.commitVersion + 1,
		};

		// グループ内複製の場合は親グループのバウンドを再計算
		if (targetGroupId !== null) {
			nextState = updateGroupBoundsFromRoot(nextState, targetGroupId);
		}

		// ── 7. lastDuplicate を更新（次回の move-aware オフセット計算用）──────
		const newCenter = getSelectionCenter(nextState, newRootIds);

		return {
			...nextState,
			lastDuplicate: newCenter
				? { newIds: newRootIds, cx: newCenter.cx, cy: newCenter.cy, offset }
				: null,
		};
	},
};
