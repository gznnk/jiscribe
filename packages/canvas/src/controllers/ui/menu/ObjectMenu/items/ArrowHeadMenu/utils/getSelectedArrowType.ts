import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../../controllers/utils/getEffectiveSelectedIds";
import type { ArrowType } from "../../../../../../../schemas/objects/types/ArrowType";

/**
 * 選択中オブジェクトの矢印タイプを取得する。
 * Connector が選択されている場合は selectedConnectorId から取得する。
 * いずれの選択オブジェクトも該当プロパティを持たない場合は "None" を返す。
 */
export const getSelectedArrowType = (
	state: CanvasControllerState,
	property: "startArrow" | "endArrow",
): ArrowType => {
	for (const id of getEffectiveSelectedIds(state)) {
		const obj = state.objects[id];
		if (obj && property in obj) {
			const value = (obj as Record<string, unknown>)[property];
			if (typeof value === "string") {
				return value as ArrowType;
			}
		}
	}
	return "None";
};
