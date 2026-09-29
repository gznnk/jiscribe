import type { ObjectPartRegistry } from "./ObjectPartRegistry";
import type { ObjectPartSelection } from "./ObjectPartSelection";
import { TEXT_SLOT_PART_KIND } from "./textSlotPartKind";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * The text slots a part selection names on one object: the picked slots
 * themselves, or the slots a kind of another sort stands for
 * (`ObjectPartDefinition.textSlotIds`) — a table's row over the cells of that
 * row.
 *
 * The one rule behind both halves of a slot-stored property, the write
 * (SelectionStyleProperty) and the value the menus state (readSelectionSlotField
 * / getSelectedOrFirstTextSlot), feeding both the same
 * resolveAddressedTextSlotIds argument — so a swatch shows the value of exactly
 * the slots its pick would change.
 *
 * @param object - The object about to be written or read; a selection sitting on
 *   another object names nothing here, which is what keeps a group's descendants
 *   out of one made on their parent
 * @param objectPartSelection - The parts picked one level below the object,
 *   already checked against the selection (resolveObjectPartSelection); null
 *   when none are
 * @param objectPart - Per-canvas ObjectPartRegistry, holding the kind's own
 *   reading of which slots it covers
 * @returns The slot ids in the type's own order, or undefined when the selection
 *   names no slot of this object — nothing picked, a pick on another object, or
 *   a kind that declares no slots (a vertex, a callout's tail). The slot rules
 *   read undefined as the whole object, so a kind declaring none keeps a write
 *   on every slot
 */
export const resolveSelectedTextSlotIds = (
	object: ObjectState,
	objectPartSelection: ObjectPartSelection | null,
	objectPart: ObjectPartRegistry,
): readonly string[] | undefined => {
	if (
		objectPartSelection === null ||
		objectPartSelection.objectId !== object.id
	) {
		return undefined;
	}
	if (objectPartSelection.kind === TEXT_SLOT_PART_KIND) {
		return objectPartSelection.partIds;
	}
	return objectPart
		.get(object.type, objectPartSelection.kind)
		?.textSlotIds?.(object, objectPartSelection.partIds);
};
