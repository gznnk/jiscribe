import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getFirstSelectedWithProp } from "../../../utils/getFirstSelectedWithProp";

export const DEFAULT_CORNER_RADIUS = 0;

/**
 * Gets the corner radius (rx) of the selected object.
 * Returns the default value if none holds a numeric rx.
 */
export const getSelectedCornerRadius = (
	state: CanvasControllerState,
): number => {
	const obj = getFirstSelectedWithProp(state.selectedIds, state.objects, "rx");
	const v = (obj as Record<string, unknown>)?.rx;
	return typeof v === "number" ? v : DEFAULT_CORNER_RADIUS;
};
