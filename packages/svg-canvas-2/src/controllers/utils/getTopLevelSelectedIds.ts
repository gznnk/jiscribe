import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * selectedIds の中から「祖先も選択済み」の子孫を除いた最上位アイテムのみを返す。
 *
 * 例: [GroupA, Rect1, Rect2] で Rect1・Rect2 が GroupA の子の場合
 *   → [GroupA] を返す（Rect1・Rect2 は除外）
 *
 * グループとその子孫が混在する選択（範囲選択など）に対して
 * グループ化操作を正しく適用するために使用する。
 */
export function getTopLevelSelectedIds(
	selectedIds: string[],
	objects: Record<string, ObjectState>,
): string[] {
	const selectedSet = new Set(selectedIds);
	return selectedIds.filter((id) => {
		let parentId = objects[id]?.parentId;
		while (parentId != null) {
			if (selectedSet.has(parentId)) return false;
			parentId = objects[parentId]?.parentId;
		}
		return true;
	});
}
