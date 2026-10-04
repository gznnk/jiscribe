import type {
	ExtraStylePropertyDescriptor,
	StyleValueType,
} from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { TextSlot } from "@jiscribe/doc/model/objects/types/text/TextSlot";

import { resolveAddressedTextSlotIds } from "./addressedTextSlots";
import { SelectionStyleProperty } from "./SelectionStyleProperty";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../states/objects/base/TextStyleState";
import type { TextSlots } from "../../states/objects/types/TextSlots";

/** The slice of StylePropertyRegistry this handler reads (structural, avoids the import cycle). */
type ExtraStyleLookup = {
	getExtra(
		type: ObjectType,
		property: string,
	): ExtraStylePropertyDescriptor | undefined;
};

/**
 * Writes one field of a slot, or takes it away again when the value is empty —
 * the rule `ExtraStylePropertyDescriptor.textSlotField` states, and the only way
 * a menu can put a slot back to carrying nothing for the property.
 */
const writeSlotField = (
	slot: TextSlot,
	field: string,
	value: string | number | boolean,
): TextSlot => {
	if (value !== "") {
		return { ...slot, [field]: value };
	}
	const remaining: Record<string, unknown> = { ...slot };
	delete remaining[field];
	return remaining as TextSlot;
};

/**
 * Fallback handler for properties with no registered handler: an object
 * supports the property iff its type declares it in ExtraStyleProperties.
 * Undeclared properties therefore apply to nothing (fail-closed).
 *
 * A declaration naming a `textSlotField` is stored on the object's text slots
 * instead of on the object, one copy per slot the selection addresses; the
 * default dot-path write covers every other declaration.
 */
export class ExtraStyleProperty extends SelectionStyleProperty {
	constructor(private readonly lookup: ExtraStyleLookup) {
		super();
	}

	protected resolveValueType(
		obj: ObjectState,
		property: string,
	): StyleValueType | undefined {
		return this.lookup.getExtra(obj.type, property)?.valueType;
	}

	protected writeValue(
		obj: ObjectState,
		path: readonly string[],
		value: string | number | boolean,
		selectedSlotIds: readonly string[] | undefined,
	): ObjectState | null {
		// The property name as it was declared; `path` is that name split on ".".
		const field = this.lookup.getExtra(obj.type, path.join("."))?.textSlotField;
		if (field === undefined) {
			return super.writeValue(obj, path, value, selectedSlotIds);
		}
		const slots = (obj as ObjectState & TextStyleState).text;
		if (slots === undefined) {
			return null;
		}
		const updatedSlots: TextSlots = { ...slots };
		for (const slotId of resolveAddressedTextSlotIds(slots, selectedSlotIds)) {
			updatedSlots[slotId] = writeSlotField(slots[slotId], field, value);
		}
		return { ...obj, text: updatedSlots } as ObjectState;
	}
}
