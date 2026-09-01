import { DEFAULT_STROKE_WIDTH } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";

import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getFirstSelectedWithProp } from "../../../utils/getFirstSelectedWithProp";

/**
 * Gets the strokeWidth of the selected object.
 * Returns the default value if none holds a numeric strokeWidth.
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
