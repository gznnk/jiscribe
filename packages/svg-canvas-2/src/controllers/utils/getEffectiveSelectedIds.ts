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
	if (state.selectedConnectorId !== null) return [state.selectedConnectorId];
	return state.selectedIds;
}
