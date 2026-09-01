import { DEFAULT_STROKE_WIDTH } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";

import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../../controllers/utils/getEffectiveSelectedIds";
import { getFirstSelectedWithProp } from "../../../utils/getFirstSelectedWithProp";

/**
 * Gets the strokeWidth of the selection (or the connector when a connector is selected).
 * Returns the default value if nothing carries a numeric strokeWidth.
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
