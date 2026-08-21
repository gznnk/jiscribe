import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";

import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../../controllers/utils/getEffectiveSelectedIds";
import { getFirstSelectedWithProp } from "../../../utils/getFirstSelectedWithProp";

/**
 * Gets the strokeDashType of the selection (or the connector when a connector is selected).
 * Returns undefined if no matching string value exists.
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
