import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import type { StrokeDashType } from "../../../../../../../schemas/objects/types/StrokeDashType";
import { getFirstSelectedWithProp } from "../../../utils/getFirstSelectedWithProp";

/**
 * 選択中オブジェクトの strokeDashType を取得する。
 * 該当する文字列値がなければ undefined を返す。
 */
export const getSelectedStrokeDashType = (
	state: CanvasControllerState,
): StrokeDashType | undefined => {
	const obj = getFirstSelectedWithProp(
		state.selectedIds,
		state.objects,
		"strokeDashType",
	);
	const v = (obj as Record<string, unknown>)?.strokeDashType;
	return typeof v === "string" ? (v as StrokeDashType) : undefined;
};
