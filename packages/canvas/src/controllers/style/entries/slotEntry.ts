import type {
	TextSlot,
	TextSlotStyle,
} from "@jiscribe/doc/model/objects/types/text/TextSlot";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import type { ObjectPartSelection } from "../../selection/CanvasSelection";
import { isTextSlotSelection } from "../../selection/partKinds/textSlotPartKind";
import { collectObjectPartIds } from "../../selection/readers/collectObjectPartIds";
import { textSlotsOf } from "../../utils/textSlotsOf";
import type { StyleContext, StyleEntry } from "../StyleEntry";

/**
 * Which slots of one object an intent lands on. A type whose slots are not the
 * keys of `text` — or one that answers for a subset of them — hands its own in
 * when it builds its table.
 *
 * @param object - The target, as the walk handed it over
 * @param pick - What is picked inside this object, null when the whole object is addressed
 * @param ctx - The walk's context
 * @returns The slot ids, in the order they are to be written; an id the object
 *   does not hold is skipped by the entry rather than written as a new slot
 * @template TState - The state the enclosing entry is written against
 */
export type SlotsOf<TState extends ObjectState> = (
	object: TState,
	pick: ObjectPartSelection | null,
	ctx: StyleContext,
) => readonly string[];

/**
 * The slots the core types address: every slot the picked ranges cover when a
 * slot is picked, otherwise every slot the object holds — which is what makes a
 * text style written with nothing picked reach the whole shape.
 *
 * @param object - The target; one holding no `text` yields nothing
 * @param pick - What is picked inside this object; a pick of another kind (a vertex) addresses every slot, as nothing does
 * @param ctx - The walk's context; its `objectPartKind` expands a slot pick through the type's `textSlot` definition (collectObjectPartIds)
 * @returns The addressed slot ids in the order the ranges cover them, always own keys of `object.text`
 * @throws When a slot is picked on a type no `textSlot` kind is registered for, which applyObjectDefinition always registers for a type taking slot picks
 */
export const defaultSlotsOf: SlotsOf<ObjectState> = (object, pick, ctx) => {
	const slots = textSlotsOf(object);
	if (slots === undefined) {
		return [];
	}
	if (!isTextSlotSelection(pick)) {
		return Object.keys(slots);
	}
	const slotPart = ctx.objectPartKind.get(object.type, pick.kind);
	if (slotPart === undefined) {
		throw new Error(
			`defaultSlotsOf: a text slot is picked on "${object.type}", which has no "${pick.kind}" part kind registered`,
		);
	}
	return collectObjectPartIds(pick, slotPart, object).filter((slotId) =>
		Object.prototype.hasOwnProperty.call(slots, slotId),
	);
};

/**
 * The pair for an intent stored on whole slots: `writeSlot` decides what one
 * slot's write does, and the rest — which slots are reached, the same-reference
 * contract, and reading each of them through the type's defaults — is shared by
 * every such intent (slotField, and the whole-slot half of runOrSlot).
 *
 * @param field - The slot field written and read; one the text-style defaults answer for
 * @param slotsOf - Which slots the intent lands on
 * @param writeSlot - One slot with the value reflected in it; copies the slot it is given rather than rebuilding it, so a type's own extra slot fields survive (TextSlots)
 * @returns The pair, writing every addressed slot and reporting one value per slot
 * @template TState - The state the entry is written against
 * @template V - The intent's value type; `field` is expected to carry it
 */
export const slotEntry = <TState extends ObjectState, V>(
	field: keyof TextSlotStyle,
	slotsOf: SlotsOf<TState>,
	writeSlot: (slot: TextSlot, value: V) => TextSlot,
): StyleEntry<TState, V> => ({
	apply: (object, pick, value, ctx) => {
		const slots = textSlotsOf(object);
		if (slots === undefined) {
			return null;
		}
		const slotIds = slotsOf(object, pick, ctx);
		if (slotIds.length === 0) {
			return null;
		}
		const updatedSlots: TextSlots = { ...slots };
		let changed = false;
		for (const slotId of slotIds) {
			const slot = slots[slotId];
			if (slot === undefined) {
				continue;
			}
			const updatedSlot = writeSlot(slot, value);
			if (updatedSlot === slot) {
				continue;
			}
			updatedSlots[slotId] = updatedSlot;
			changed = true;
		}
		return changed ? ({ ...object, text: updatedSlots } as TState) : object;
	},
	read: (object, pick, ctx) => {
		const slots = textSlotsOf(object);
		if (slots === undefined) {
			return [];
		}
		const values: V[] = [];
		for (const slotId of slotsOf(object, pick, ctx)) {
			const slot = slots[slotId];
			if (slot === undefined) {
				continue;
			}
			// A field neither the slot nor its type's defaults set stays absent, and
			// is reported as the value it is: the reader's own last resort
			// (TEXT_STYLE_FALLBACK) is what such a slot is drawn with, and two slots
			// leaving it unset agree rather than disagreeing.
			values.push(
				ctx.textStyleDefaults.resolveSlotStyle(object.type, slotId, slot)[
					field
				] as V,
			);
		}
		return values;
	},
});
