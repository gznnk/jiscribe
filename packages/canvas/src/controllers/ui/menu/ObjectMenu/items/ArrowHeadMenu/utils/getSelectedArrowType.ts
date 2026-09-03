import type { ARROW_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/ArrowStyleDoc";
import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";

import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../../controllers/utils/getEffectiveSelectedIds";

/**
 * Gets the arrow type of the selected object.
 * When a connector is selected, it is read from selectedConnectorId.
 * Returns "None" if none of the selected objects have the property.
 *
 * @param state - The controller state read through; the effective selection decides
 *   which objects are consulted, in that order
 * @param property - Which end to read, named by ARROW_STYLE_KEYS so the pair cannot
 *   drift from the group the doc declares
 */
export const getSelectedArrowType = (
	state: CanvasControllerState,
	property: (typeof ARROW_STYLE_KEYS)[number],
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
