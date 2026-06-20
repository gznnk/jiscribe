import type { CanvasControllerState } from "../CanvasTypes";

/**
 * 選択状態に応じた実効的な選択IDリストを返す。
 * Connector が選択されている場合（selectedConnectorId != null）は
 * selectedIds の代わりに [selectedConnectorId] を返す。
 *
 * useMemo 内では { selectedIds, selectedConnectorId } を渡すことで
 * state 全体への依存を避けられる。
 */
export function getEffectiveSelectedIds(
	state: Pick<CanvasControllerState, "selectedIds" | "selectedConnectorId">,
): string[] {
	// null / undefined のどちらも「コネクター未選択」として扱う
	// （部分的な state では selectedConnectorId が省略され undefined になりうる）。
	if (state.selectedConnectorId != null) {
		return [state.selectedConnectorId];
	}
	return state.selectedIds;
}
