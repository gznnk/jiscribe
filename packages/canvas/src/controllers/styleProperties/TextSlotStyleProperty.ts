import { SelectionStyleProperty } from "./SelectionStyleProperty";
import type { StyleValueType } from "../../schemas/objects/types/ExtraStyleProperty";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../states/objects/base/TextStyleState";
import type { TextSlots } from "../../states/objects/types/TextSlots";

/**
 * A text styling property (fontSize, textAlign, …), supported by every object
 * that holds text whatever shape its doc uses (`features.text`).
 *
 * Text styling is stored per slot, so one update writes into **every** slot of
 * the object. That reproduces what the menus did while the styling was
 * shape-wide; a UI for styling one slot on its own would need a different
 * handler, not a different write here.
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
	): ObjectState | null {
		const slots = (obj as ObjectState & TextStyleState).text;
		if (slots === undefined) {
			return null;
		}
		const property = path[0];
		const updatedSlots: TextSlots = Object.fromEntries(
			Object.entries(slots).map(([slotId, slot]) => [
				slotId,
				{ ...slot, [property]: value },
			]),
		);
		return { ...obj, text: updatedSlots } as ObjectState;
	}
}
