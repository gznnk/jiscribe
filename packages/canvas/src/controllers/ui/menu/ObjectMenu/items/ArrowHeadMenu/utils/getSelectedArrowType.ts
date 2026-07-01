import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../../controllers/utils/getEffectiveSelectedIds";
import type { ArrowType } from "../../../../../../../schemas/objects/types/ArrowType";

/**
 * Gets the arrow type of the selected object.
 * When a connector is selected, it is read from selectedConnectorId.
 * Returns "None" if none of the selected objects have the property.
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
