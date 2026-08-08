import { SelectionStyleProperty } from "./SelectionStyleProperty";
import type { StyleValueType } from "../../schemas/objects/types/ExtraStyleProperty";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../states/objects/base/TextStyleState";
import type { TextSlots } from "../../states/objects/types/TextSlots";

/**
 * A text styling property (fontSize, textAlign, …), supported by every object
 * that holds text whatever shape its doc uses (`features.text`).
 *
 * Text styling is stored per slot, so the write targets whichever slots the
 * selection addresses: the one slot selected below the object when there is
 * one, otherwise **every** slot of the object. The menus read their current
 * value through the same rule (getSelectedOrFirstTextSlot).
 */
export class TextSlotStyleProperty extends SelectionStyleProperty {
	constructor(readonly valueType: StyleValueType) {
		super();
	}

	protected resolveValueType(obj: ObjectState): StyleValueType | undefined {
		return obj.features?.text !== undefined ? this.valueType : undefined;
	}

	protected writeValue(
		obj: ObjectState,
		path: readonly string[],
		value: string | number | boolean,
		selectedSlotId: string | undefined,
	): ObjectState | null {
		const slots = (obj as ObjectState & TextStyleState).text;
		if (slots === undefined) {
			return null;
		}
		const property = path[0];
		const selectedSlot =
			selectedSlotId === undefined ? undefined : slots[selectedSlotId];
		if (selectedSlotId !== undefined && selectedSlot !== undefined) {
			return {
				...obj,
				text: {
					...slots,
					[selectedSlotId]: { ...selectedSlot, [property]: value },
				},
			} as ObjectState;
		}
		const updatedSlots: TextSlots = Object.fromEntries(
			Object.entries(slots).map(([slotId, slot]) => [
				slotId,
				{ ...slot, [property]: value },
			]),
		);
		return { ...obj, text: updatedSlots } as ObjectState;
	}
}
