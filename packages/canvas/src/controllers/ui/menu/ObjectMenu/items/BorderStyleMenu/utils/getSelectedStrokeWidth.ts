import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getFirstSelectedWithProp } from "../../../../../../../controllers/utils/getFirstSelectedWithProp";

export const DEFAULT_STROKE_WIDTH = 2;

/**
 * 選択中オブジェクトの strokeWidth を取得する。
 * 数値を持つものがなければ既定値を返す。
 */
export const getSelectedStrokeWidth = (
	state: CanvasControllerState,
): number => {
	const obj = getFirstSelectedWithProp(
		state.selectedIds,
		state.objects,
		"strokeWidth",
	);
	const v = (obj as Record<string, unknown>)?.strokeWidth;
	return typeof v === "number" ? v : DEFAULT_STROKE_WIDTH;
};
