import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ObjectPartSelection } from "../../../selection/CanvasSelection";
import { collectObjectPartIds } from "../../../selection/readers/collectObjectPartIds";
import { textSlotsOf } from "../../../utils/textSlotsOf";
import type { StyleContext } from "../../StyleEntry";

/**
 * The ids of the slots of one object a text style lands on, as the picked kind
 * declares them (`ObjectPartKindDefinition.textSlotIds`): the picked slots for a
 * slot pick, a table row's cells for a row pick. A pick of a kind declaring no
 * `textSlotIds` (a vertex), and no pick at all, reach every slot — which is what
 * makes a text style written over the whole object reach the whole shape.
 *
 * @param object - The target, as the walk handed it over; one holding no `text` yields nothing
 * @param pick - What is picked inside this object, null when the whole object is addressed
 * @param ctx - The walk's context; its `objectPartKind` answers for the picked kind, whose ranges are expanded (collectObjectPartIds) before `textSlotIds` is asked
 * @returns The slot ids in the order the kind gives them, always own keys of `object.text`
 * @throws When the picked kind is not registered for the object's type, which reconcileSelection never lets a selection hold
 */
export const resolveTextSlotIds = (
	object: ObjectState,
	pick: ObjectPartSelection | null,
	ctx: StyleContext,
): readonly string[] => {
	const slots = textSlotsOf(object);
	if (slots === undefined) {
		return [];
	}
	if (pick === null) {
		return Object.keys(slots);
	}
	const partKind = ctx.objectPartKind.get(object.type, pick.kind);
	if (partKind === undefined) {
		throw new Error(
			`resolveTextSlotIds: "${pick.kind}" is picked on "${object.type}", which has no such part kind registered`,
		);
	}
	if (partKind.textSlotIds === undefined) {
		return Object.keys(slots);
	}
	// hasOwnProperty rather than a lookup: "toString" names an Object.prototype
	// member on every slot map, and a slot is not that.
	return partKind
		.textSlotIds(object, collectObjectPartIds(pick, partKind, object))
		.filter((slotId) => Object.prototype.hasOwnProperty.call(slots, slotId));
};
