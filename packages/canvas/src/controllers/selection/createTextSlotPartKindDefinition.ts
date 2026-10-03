import type { ObjectPartKindDefinition } from "./ObjectPartKindRegistry";
import { TEXT_SLOT_PART_KIND } from "./textSlotPartKind";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";

/**
 * The `textSlot` part definition every `features.text === "slots"` type gets,
 * with part ids spelled as the keys of the object's own `text` — the same ids
 * the slot elements already carry in their `data-part`. Nothing in it is
 * per-type, which is why applyObjectDefinition registers it without the type
 * saying anything.
 *
 * @returns A definition to put in the type's `ObjectTypeDefinition.partKinds`,
 *   where it replaces the automatic registration
 */
export const createTextSlotPartKindDefinition =
	(): ObjectPartKindDefinition => ({
		kind: TEXT_SLOT_PART_KIND,

		// hasOwnProperty rather than a lookup: "toString" names an
		// Object.prototype member on every slot map, and a slot is not that.
		has: (object, partId) =>
			isTextStyleState(object) &&
			object.text !== undefined &&
			Object.prototype.hasOwnProperty.call(object.text, partId),

		// The identity: these part ids are slot ids already, which is what spares the
		// slot rules a special case for this kind (resolveSelectedTextSlotIds).
		textSlotIds: (_object, partIds) => partIds,
	});
