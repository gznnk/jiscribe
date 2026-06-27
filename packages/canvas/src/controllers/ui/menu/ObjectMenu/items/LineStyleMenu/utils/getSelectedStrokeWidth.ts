import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../../controllers/utils/getEffectiveSelectedIds";
import { getFirstSelectedWithProp } from "../../../../../../../controllers/utils/getFirstSelectedWithProp";

export const DEFAULT_STROKE_WIDTH = 2;

/**
 * 選択中（コネクター選択時はそのコネクター）の strokeWidth を取得する。
 * 数値を持つものがなければ既定値を返す。
 */
export const getSelectedStrokeWidth = (
	state: CanvasControllerState,
): number => {
	const obj = getFirstSelectedWithProp(
		getEffectiveSelectedIds(state),
		state.objects,
		"strokeWidth",
	);
	const v = (obj as Record<string, unknown>)?.strokeWidth;
	return typeof v === "number" ? v : DEFAULT_STROKE_WIDTH;
};
