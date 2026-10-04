import type { CanvasSelection } from "./CanvasSelection";
import type { ObjectPartKindRegistry } from "./ObjectPartKindRegistry";
import { isTextSlotSelection, TEXT_SLOT_PART_KIND } from "./textSlotPartKind";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Points the selection at one text slot of one object: what every writer that
 * opens a shape's text editor states, since what is being edited is the
 * selection rather than something the session names (see `textEditState`).
 *
 * Only a type that spells its text out as slots takes a slot pick
 * (applyObjectDefinition registers the kind for it alone); a type holding one
 * body has nothing to pick below itself, so its selection stays at the object
 * and the slot is the one body it holds.
 *
 * @param selection - The selection to move; returned as it stands when it
 *   already names this object and this slot alone, so memoized readers hold
 * @param object - The object the slot belongs to; becomes the whole object
 *   selection, dropping whatever else was selected
 * @param slotId - Key of the object's `text`, written as one collapsed range
 * @param objectPartKind - Per-canvas registry of part kinds, asked whether the
 *   object's type takes a slot pick at all
 * @returns The selection naming that slot, or `selection` itself (same
 *   reference) when it already did
 */
export const selectTextSlot = (
	selection: CanvasSelection,
	object: ObjectState,
	slotId: string,
	objectPartKind: ObjectPartKindRegistry,
): CanvasSelection => {
	const { objectIds, part } = selection;
	const isSameObject = objectIds.length === 1 && objectIds[0] === object.id;
	const takesSlotPick =
		objectPartKind.get(object.type, TEXT_SLOT_PART_KIND) !== undefined;
	if (!takesSlotPick) {
		return isSameObject && part === null
			? selection
			: { objectIds: isSameObject ? objectIds : [object.id], part: null };
	}
	if (
		isSameObject &&
		isTextSlotSelection(part) &&
		part.ranges.length === 1 &&
		part.ranges[0].anchorId === slotId &&
		part.ranges[0].focusId === slotId
	) {
		return selection;
	}
	return {
		objectIds: isSameObject ? objectIds : [object.id],
		part: {
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: slotId, focusId: slotId }],
		},
	};
};
