import type { Point } from "@workspace/geometry";

import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { GroupState } from "../../states/objects/primitives/group/GroupState";
import { moveGroup } from "../gestures/handlers/objects/primitives/GroupController";
import { objectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";

export type MoveSelectionParams = {
	/**
	 * 移動対象の選択 ID 一覧
	 */
	selectedIds: string[];
	/**
	 * 移動元のオブジェクトマップ。
	 * ドラッグ時はドラッグ開始スナップショット、コマンド時は現在の state.objects を渡す。
	 */
	srcObjects: Record<string, ObjectState>;
	/**
	 * 移動元の multiSelectGroup（位置・プロパティの基準）。
	 * null の場合は複数選択グループなし。
	 */
	srcMultiSelectGroup: GroupState | null;
	/**
	 * 移動量。ドラッグ時はスナップ補正済みの累積 delta、コマンド時は 1 回分の delta
	 */
	delta: Point;
};

export type MoveSelectionResult = {
	/** 移動後のオブジェクトマップ（srcObjects のクローン） */
	objects: Record<string, ObjectState>;
	/** 平行移動後の multiSelectGroup（src が null なら null） */
	multiSelectGroup: GroupState | null;
};

/**
 * 選択中のオブジェクトをまとめて delta だけ平行移動する純粋関数。
 *
 * ドラッグ移動・矢印キー移動（ナッジ）の両方が共有する移動ロジック。
 * - グループは子孫を再帰的に移動する
 * - その他の図形は形状ごとの moveByDelta（Registry 経由）で移動する
 * - multiSelectGroup の中心（cx/cy）も同期する
 *
 * 親グループのバウンディングボックス更新・snapFeedback・commitVersion の扱いは
 * 文脈ごとに異なるため、呼び出し側の責務とする（ここでは触らない）。
 */
export function moveSelection(
	params: MoveSelectionParams,
): MoveSelectionResult {
	const { selectedIds, srcObjects, srcMultiSelectGroup, delta } = params;

	const objects = { ...srcObjects };

	for (const selectedId of selectedIds) {
		const selectedObject = srcObjects[selectedId];
		if (!selectedObject) {
			continue;
		}

		if (selectedObject.type === "group") {
			// Group: 子孫も再帰的に移動（read: srcObjects / write: objects）
			moveGroup(selectedId, srcObjects, objects, delta);
		} else {
			const moveByDelta = objectBehaviorRegistry.getMoveByDelta(
				selectedObject.type,
			);
			if (moveByDelta) {
				objects[selectedId] = moveByDelta(selectedObject, delta);
			}
		}
	}

	const multiSelectGroup: GroupState | null = srcMultiSelectGroup
		? {
				...srcMultiSelectGroup,
				cx: srcMultiSelectGroup.cx + delta.x,
				cy: srcMultiSelectGroup.cy + delta.y,
			}
		: null;

	return { objects, multiSelectGroup };
}
