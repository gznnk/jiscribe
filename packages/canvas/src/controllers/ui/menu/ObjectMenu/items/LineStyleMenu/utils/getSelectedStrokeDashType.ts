import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../../controllers/utils/getEffectiveSelectedIds";
import type { StrokeDashType } from "../../../../../../../schemas/objects/types/StrokeDashType";
import { getFirstSelectedWithProp } from "../../../utils/getFirstSelectedWithProp";

/**
 * 選択中（コネクター選択時はそのコネクター）の strokeDashType を取得する。
 * 該当する文字列値がなければ undefined を返す。
 */
export const getSelectedStrokeDashType = (
	state: CanvasControllerState,
): StrokeDashType | undefined => {
	const obj = getFirstSelectedWithProp(
		getEffectiveSelectedIds(state),
		state.objects,
		"strokeDashType",
	);
	const v = (obj as Record<string, unknown>)?.strokeDashType;
	return typeof v === "string" ? (v as StrokeDashType) : undefined;
};
