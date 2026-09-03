import type { StyleValueType } from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";

import { SelectionStyleProperty } from "./SelectionStyleProperty";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../states/objects/base/TextStyleState";
import {
	getFirstTextSlotId,
	writeTextSlot,
} from "../../states/objects/types/TextSlots";

/**
 * The text *content* as a property ("text"), for programmatic updates
 * (onPropertyUpdate and `set:text:…` menu actions). It writes the object's
 * default slot — the first key, the same slot Enter-started editing opens —
 * through writeTextSlot, so the other slots, the key order, the slot's styling,
 * and its content kind (rows split on "\n") all survive; a dot-path write would
 * flatten the keyed form.
 */
export class TextContentProperty extends SelectionStyleProperty {
	protected resolveValueType(obj: ObjectState): StyleValueType | undefined {
		return obj.features?.text !== undefined ? "string" : undefined;
	}

	protected writeValue(
		obj: ObjectState,
		_path: readonly string[],
		value: string | number | boolean,
	): ObjectState | null {
		const slots = (obj as ObjectState & TextStyleState).text;
		const slotId = getFirstTextSlotId(slots);
		if (slots === undefined || slotId === undefined) {
			return null;
		}
		return {
			...obj,
			text: writeTextSlot(slots, slotId, String(value)),
		} as ObjectState;
	}
}
