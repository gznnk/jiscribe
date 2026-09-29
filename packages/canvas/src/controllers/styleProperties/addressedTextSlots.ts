import type { TextSlots } from "../../states/objects/types/TextSlots";

/**
 * The slots a slot-level write lands on: the ones picked one level below the
 * object, or every slot of it when none are.
 *
 * The one rule behind both halves of a slot-stored property — the write
 * (TextSlotStyleProperty / ExtraStyleProperty) and the value the menus state
 * (readSelectionSlotField) — so what a swatch shows is read off exactly the
 * slots the pick would change.
 *
 * @param slots - The object's slots as its state holds them; an empty map yields an empty list
 * @param selectedSlotIds - The picked slot ids in the type's own order, as
 *   SelectionStyleProperty.writeValue is handed them; undefined when nothing is
 *   picked below the object
 * @returns The ids to write, in the order they were given (picked) or keyed
 *   (every slot). A picked id the object has since lost is dropped, and a
 *   selection left with none of them falls back to every slot — the reading of
 *   nothing being picked
 */
export const resolveAddressedTextSlotIds = (
	slots: TextSlots,
	selectedSlotIds: readonly string[] | undefined,
): string[] => {
	const liveSlotIds = selectedSlotIds?.filter(
		(slotId) => slots[slotId] !== undefined,
	);
	return liveSlotIds !== undefined && liveSlotIds.length > 0
		? liveSlotIds
		: Object.keys(slots);
};
