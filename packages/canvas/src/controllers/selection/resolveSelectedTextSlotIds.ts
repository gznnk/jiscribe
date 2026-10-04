import type { CanvasSelection } from "./CanvasSelection";
import { collectObjectPartIds } from "./collectObjectPartIds";
import type { ObjectPartKindRegistry } from "./ObjectPartKindRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * The text slots a part selection names on one object: the picked slots
 * themselves (the `"textSlot"` kind declares the identity), or the slots a kind
 * of another sort stands for (`ObjectPartKindDefinition.textSlotIds`) — a
 * table's row over the cells of that row.
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
 * @param selection - What the canvas is pointed at; its `part` is taken as it
 *   stands (the reducer has already dropped one naming something gone,
 *   reconcileSelection), and its first object id is the part's owner
 * @param objectPartKind - Per-canvas ObjectPartKindRegistry, holding the kind's own
 *   reading of which slots it covers
 * @returns The slot ids in the type's own order, or undefined when the selection
 *   names no slot of this object — nothing picked, a pick on another object, an
 *   unregistered kind, or a kind that declares no slots (a vertex, a callout's
 *   tail). The slot rules read undefined as the whole object, so a kind
 *   declaring none keeps a write on every slot
 */
export const resolveSelectedTextSlotIds = (
	object: ObjectState,
	selection: CanvasSelection,
	objectPartKind: ObjectPartKindRegistry,
): readonly string[] | undefined => {
	const { objectIds, part: objectPartSelection } = selection;
	if (objectPartSelection === null || objectIds[0] !== object.id) {
		return undefined;
	}
	const part = objectPartKind.get(object.type, objectPartSelection.kind);
	if (part?.textSlotIds === undefined) {
		return undefined;
	}
	return part.textSlotIds(
		object,
		collectObjectPartIds(objectPartSelection, part, object),
	);
};
