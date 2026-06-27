import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";

/**
 * 選択中オブジェクトの lockAspectRatio 値を取得する。
 * 複数選択時は multiSelectGroup の値を優先、単一選択時は選択オブジェクトの値を返す。
 * いずれも持たない場合は false。
 */
export const getSelectedLockAspectRatio = (
	state: CanvasControllerState,
): boolean => {
	// 複数選択時はmultiSelectGroupの値を使用
	if (state.multiSelectGroup) {
		return state.multiSelectGroup.lockAspectRatio ?? false;
	}

	// 単一選択時は選択オブジェクトの値を使用
	for (const id of state.selectedIds) {
		const obj = state.objects[id];
		if (
			obj &&
			"lockAspectRatio" in obj &&
			typeof obj.lockAspectRatio === "boolean"
		) {
			return obj.lockAspectRatio;
		}
	}
	return false;
};
