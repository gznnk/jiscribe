import type { StyleValueType } from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";
import type { InlineTextStyle } from "@jiscribe/doc/model/objects/types/RichText";
import {
	clearInlineStyleFromRuns,
	TEXT_INLINE_STYLE_KEYS,
} from "@jiscribe/doc/model/objects/types/RichText";
import type { TextSlot } from "@jiscribe/doc/model/objects/types/TextSlot";
import { isTextRows } from "@jiscribe/doc/model/objects/types/TextSlot";

import {
	coerceStyleValue,
	SelectionStyleProperty,
} from "./SelectionStyleProperty";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../states/objects/base/TextStyleState";
import type { TextSlots } from "../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../CanvasTypes";
import {
	resolveTextEditSelection,
	styleTextEditSelection,
} from "../utils/styleTextEditSelection";

/**
 * A text styling property (fontSize, textAlign, …), supported by every object
 * that holds text whatever shape its doc uses (`features.text`).
 *
 * Text styling is stored per slot, so the write targets whichever slots the
 * selection addresses: the one slot selected below the object when there is
 * one, otherwise **every** slot of the object. The menus read their current
 * value through the same rule (getSelectedOrFirstTextSlot).
 *
 * The exception is an open editor with a stretch of its text selected: the
 * property then lands on those characters only (styleTextEditSelection), which is
 * what makes the text menus style a selection rather than the whole slot.
 */
export class TextSlotStyleProperty extends SelectionStyleProperty {
	constructor(readonly valueType: StyleValueType) {
		super();
	}

	apply(
		state: CanvasControllerState,
		property: string,
		value: string,
	): CanvasControllerState {
		const ranged = this.applyToTextEditSelection(state, property, value);
		if (ranged !== null) {
			return ranged;
		}
		return this.clearAppliedInlineStyleFromDraft(
			super.apply(state, property, value),
			state,
			property,
		);
	}

	/**
	 * Drops a slot-wide written property from the open editor's draft as well.
	 * The slot content was just stripped of its per-run overrides (writeSlotValue),
	 * but the draft carries the same overrides and would write them back over the
	 * slot on the next graft, leaving the slot-wide value invisible.
	 */
	private clearAppliedInlineStyleFromDraft(
		applied: CanvasControllerState,
		before: CanvasControllerState,
		property: string,
	): CanvasControllerState {
		const { textEditState } = applied;
		if (
			textEditState?.kind !== "shape" ||
			!(TEXT_INLINE_STYLE_KEYS as readonly string[]).includes(property)
		) {
			return applied;
		}
		// Only when the write landed on the edited slot: an untouched slot keeps its
		// object reference, and clearing the draft for it would drop real styling.
		const editedBefore = before.objects[textEditState.objectId] as
			(ObjectState & TextStyleState) | undefined;
		const editedAfter = applied.objects[textEditState.objectId] as
			(ObjectState & TextStyleState) | undefined;
		if (
			editedAfter === undefined ||
			editedBefore?.text?.[textEditState.slotId] ===
				editedAfter.text?.[textEditState.slotId]
		) {
			return applied;
		}
		const cleared = clearInlineStyleFromRuns(textEditState.text, [
			property as keyof InlineTextStyle,
		]);
		return {
			...applied,
			textEditState: { ...textEditState, text: cleared },
		};
	}

	/**
	 * Writes the property onto the characters the open editor has selected.
	 *
	 * @returns The new state, or null when this write is not a per-range one: no
	 *   selected stretch of text, or a property that places the whole block
	 *   (the alignment) and so has nowhere smaller to apply
	 */
	private applyToTextEditSelection(
		state: CanvasControllerState,
		property: string,
		value: string,
	): CanvasControllerState | null {
		if (!(TEXT_INLINE_STYLE_KEYS as readonly string[]).includes(property)) {
			return null;
		}
		if (resolveTextEditSelection(state) === null) {
			return null;
		}
		const coerced = coerceStyleValue(this.valueType, value);
		if (coerced === null) {
			return null;
		}
		return styleTextEditSelection(state, { [property]: coerced });
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
					[selectedSlotId]: this.writeSlotValue(selectedSlot, property, value),
				},
			} as ObjectState;
		}
		const updatedSlots: TextSlots = Object.fromEntries(
			Object.entries(slots).map(([slotId, slot]) => [
				slotId,
				this.writeSlotValue(slot, property, value),
			]),
		);
		return { ...obj, text: updatedSlots } as ObjectState;
	}

	/**
	 * Writes the property onto one whole slot, dropping it from the runs that
	 * overrode it: a value set on the whole text has to win over the stretches it
	 * was set on part of it, or the slot would change and nothing would look
	 * different. A row-partitioned slot is stripped row by row, each row being a
	 * body of its own. The rest of a run's styling stays. The doc-ops apply the
	 * same rule (applyStyle).
	 */
	private writeSlotValue(
		slot: TextSlot,
		property: string,
		value: string | number | boolean,
	): TextSlot {
		if (!(TEXT_INLINE_STYLE_KEYS as readonly string[]).includes(property)) {
			return { ...slot, [property]: value };
		}
		const inlineKeys = [property as keyof InlineTextStyle];
		const content = isTextRows(slot.text)
			? slot.text.map((row) => clearInlineStyleFromRuns(row, inlineKeys))
			: clearInlineStyleFromRuns(slot.text, inlineKeys);
		return { ...slot, text: content, [property]: value };
	}
}
