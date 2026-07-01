import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import type { StrokeDashType } from "../../../../../../../schemas/objects/types/StrokeDashType";
import { getFirstSelectedWithProp } from "../../../utils/getFirstSelectedWithProp";

/**
 * Gets the strokeDashType of the selected object.
 * Returns undefined if no matching string value is present.
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
