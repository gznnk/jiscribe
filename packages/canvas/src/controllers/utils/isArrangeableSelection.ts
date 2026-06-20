import type { CanvasControllerState } from "../CanvasTypes";
import { getEffectiveSelectedIds } from "./getEffectiveSelectedIds";

/**
 * arrange（重なり順変更）コマンドの実行可否を判定する。
 *
 * オブジェクト選択（selectedIds）に加えてコネクター選択（selectedConnectorId）も
 * 対象にするため、getEffectiveSelectedIds 経由の実効選択で判定する。
 * 実効選択が空でなく、かつ全要素が同じ親（同一グループ内 or すべてルート）に
 * 属するときに true。コネクターは常に root 直下なので単独で常に true になる。
 */
export function isArrangeableSelection(state: CanvasControllerState): boolean {
	const ids = getEffectiveSelectedIds(state);
	if (ids.length === 0) {
		return false;
	}
	const firstParentId = state.objects[ids[0]]?.parentId;
	return ids.every((id) => state.objects[id]?.parentId === firstParentId);
}
