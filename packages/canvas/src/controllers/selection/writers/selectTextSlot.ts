import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasSelection } from "../CanvasSelection";
import {
	isTextSlotPart,
	TEXT_SLOT_PART_KIND,
} from "../partKinds/textSlotPartKind";

/**
 * Points the selection at one text slot of one object: what every writer that
 * opens a shape's text editor states, since what is being edited is the
 * selection rather than something the session names (see `textEditState`).
 *
 * @param selection - The selection to move; returned as it stands when it
 *   already names this object and this slot alone, so memoized readers hold
 * @param object - The object the slot belongs to; becomes the whole object
 *   selection, dropping whatever else was selected
 * @param slotId - Key of the object's `text`, written as one collapsed textSlot
 *   range whatever the type's text shape (a one-body type's is
 *   `BODY_TEXT_SLOT_ID`)
 * @returns The selection naming that slot, or `selection` itself (same
 *   reference) when it already did
 */
export const selectTextSlot = (
	selection: CanvasSelection,
	object: ObjectState,
	slotId: string,
): CanvasSelection => {
	const { objectIds, part } = selection;
	// The object becomes the whole selection; a group or a multi-selection it was
	// part of is dropped, and the array is kept only when it already named this
	// object alone.
	const isSameObject = objectIds.length === 1 && objectIds[0] === object.id;
	if (
		isSameObject &&
		isTextSlotPart(part) &&
		part.ranges.length === 1 &&
		part.ranges[0].anchorId === slotId &&
		part.ranges[0].focusId === slotId
	) {
		// Already this object and this slot alone: same reference.
		return selection;
	}
	// Replaces whatever part (another slot, a vertex, none) was picked before.
	return {
		objectIds: isSameObject ? objectIds : [object.id],
		part: {
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: slotId, focusId: slotId }],
		},
	};
};
