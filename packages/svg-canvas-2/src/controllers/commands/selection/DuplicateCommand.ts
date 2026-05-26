import { calcPolyBoundingBox, isTransformedFrame } from "@workspace/geometry";

import { isPoly } from "../../../schemas/objects/types/Poly";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createMultiSelectGroup } from "../../gestures/handlers/objects/utils/createMultiSelectGroup";
import { cloneObjects } from "../../reducer/handlers/cloneObjects";
import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";
import type { Command } from "../CommandTypes";

const DUPLICATE_OFFSET = { x: 20, y: 20 };

/**
 * 選択中オブジェクトの現在の中心座標を返す。
 * 複数選択: multiSelectGroup の cx/cy を使用。
 * 単一選択: オブジェクト型に応じて cx/cy またはバウンドボックス中心を算出。
 */
function getSelectionCenter(
	state: CanvasControllerState,
	ids: string[],
): { cx: number; cy: number } | null {
	if (ids.length === 0) {
		return null;
	}

	if (ids.length > 1) {
		const msg = state.multiSelectGroup;
		return msg ? { cx: msg.cx, cy: msg.cy } : null;
	}

	const obj = state.objects[ids[0]];
	if (!obj) {
		return null;
	}

	if (obj.type === "group") {
		const g = obj as GroupState;
		return { cx: g.cx, cy: g.cy };
	}
	if (isTransformedFrame(obj)) {
		return { cx: obj.cx, cy: obj.cy };
	}
	if (isPoly(obj)) {
		const bbox = calcPolyBoundingBox(obj.points);
		if (!bbox) {
			return null;
		}
		return {
			cx: (bbox.left + bbox.right) / 2,
			cy: (bbox.top + bbox.bottom) / 2,
		};
	}

	return null;
}

/**
 * Move-aware オフセットを計算する。
 *
 * - 直前の複製で作ったオブジェクトが現在選択されている場合:
 *     ユーザーが動かした距離を次のオフセットとして使用（Figma 方式）
 *     ほとんど動いていない場合は前回のオフセットを継続
 * - それ以外: DUPLICATE_OFFSET を使用
 */
function computeOffset(state: CanvasControllerState): { x: number; y: number } {
	const { lastDuplicate, selectedIds } = state;
	if (!lastDuplicate) {
		return DUPLICATE_OFFSET;
	}

	// 選択セットが直前の複製結果と一致するか確認
	if (lastDuplicate.newIds.length !== selectedIds.length) {
		return DUPLICATE_OFFSET;
	}
	const lastSet = new Set(lastDuplicate.newIds);
	if (!selectedIds.every((id) => lastSet.has(id))) {
		return DUPLICATE_OFFSET;
	}

	// 現在の選択中心を取得
	const center = getSelectionCenter(state, selectedIds);
	if (!center) {
		return lastDuplicate.offset;
	}

	const dx = center.cx - lastDuplicate.cx;
	const dy = center.cy - lastDuplicate.cy;

	// ほぼ動いていない（1px 未満）→ 前回オフセットを継続
	if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
		return lastDuplicate.offset;
	}

	// 動かした距離を新しいオフセットとして採用
	return { x: dx, y: dy };
}

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
		const connectorIds: string[] = [];
		for (const connId of state.connectorIds) {
			const conn = state.objects[connId] as ConnectorState | undefined;
			if (!conn) {
				continue;
			}
			const sourceOwnerId = conn.source.owner?.id;
			const targetOwnerId = conn.target.owner?.id;
			const sourceOk =
				!sourceOwnerId || selectedIdsWithDescendants.has(sourceOwnerId);
			const targetOk =
				!targetOwnerId || selectedIdsWithDescendants.has(targetOwnerId);
			if (sourceOk && targetOk) {
				connectorIds.push(connId);
				allObjects[connId] = conn;
			}
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
		const offset = computeOffset(state);

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
