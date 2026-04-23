import type { CanvasControllerState } from "../CanvasTypes";

/**
 * 選択中の全オブジェクトが同じ親（同一グループ内、またはすべてルートレベル）に属しているかを判定する。
 * arrangeコマンドの実行可否判断や、ObjectMenu の表示制御に使用する。
 */
export function isSameGroupSelection(state: CanvasControllerState): boolean {
	const { selectedIds, objects } = state;
	if (selectedIds.length === 0) return false;
	const firstParentId = objects[selectedIds[0]]?.parentId;
	return selectedIds.every((id) => objects[id]?.parentId === firstParentId);
}
