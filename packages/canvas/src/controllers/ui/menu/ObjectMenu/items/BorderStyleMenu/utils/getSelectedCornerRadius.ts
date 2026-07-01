import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getFirstSelectedWithProp } from "../../../utils/getFirstSelectedWithProp";

export const DEFAULT_CORNER_RADIUS = 0;

/**
 * 選択中オブジェクトの角丸半径 (rx) を取得する。
 * 数値を持つものがなければ既定値を返す。
 */
export const getSelectedCornerRadius = (
	state: CanvasControllerState,
): number => {
	const obj = getFirstSelectedWithProp(state.selectedIds, state.objects, "rx");
	const v = (obj as Record<string, unknown>)?.rx;
	return typeof v === "number" ? v : DEFAULT_CORNER_RADIUS;
};
