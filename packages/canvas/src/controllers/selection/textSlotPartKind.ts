import type { ObjectPartSelection } from "./ObjectPartSelection";
import { formatPartAddress, parsePartAddress } from "./partAddress";

/**
 * The part-id namespace of the text slots a `features.text === "slots"` type
 * spells out, with part ids spelled as the slot keys of the object's `text` —
 * the id half of the `data-part` its slot elements carry ({@link textSlotPart}).
 */
export const TEXT_SLOT_PART_KIND = "textSlot";

/**
 * The `data-part` one text slot's element carries: how a click picks that slot
 * (applyPartClick) and a double click opens it for editing (resolveTextSlotId).
 * A shape drawing one hit region per slot marks each region with it.
 *
 * @param slotId - Key of the shape's own `text`; an id the shape does not hold
 *   addresses nothing, so a click on it steps back up to the object
 * @returns The `data-part` value, `textSlot:<slotId>`
 */
export const textSlotPart = (slotId: string): string =>
	formatPartAddress(TEXT_SLOT_PART_KIND, slotId);

/**
 * The inverse of {@link textSlotPart}: the slot id a pressed element's address
 * names, for the double click that opens a slot for editing (resolveTextSlotId).
 *
 * @param targetPart - `event.targetPart`; undefined for a press on the body
 * @returns The slot id, or undefined when the address is not a text slot's — no
 *   address at all, or one of another kind (a vertex). The id is untrusted DOM
 *   text; whether the shape holds that slot is the caller's check
 */
export const readTextSlotPart = (
	targetPart: string | undefined,
): string | undefined => {
	const address = parsePartAddress(targetPart);
	return address?.kind === TEXT_SLOT_PART_KIND ? address.partId : undefined;
};

/**
 * Whether what is picked one level below the object is a text slot. Core
 * registers this one kind for every text slot there is, so comparing the name is
 * the definition itself rather than a lookup standing in for one.
 *
 * @param objectPartSelection - The parts picked one level below the object,
 *   taken as it stands (the reducer has already dropped one naming something
 *   gone, reconcileObjectPartSelection); null when none are
 * @returns True only while a slot is picked; false when nothing is picked below
 *   the object, or what is picked is of another kind (a vertex)
 */
export const isTextSlotSelection = (
	objectPartSelection: ObjectPartSelection | null,
): objectPartSelection is ObjectPartSelection =>
	objectPartSelection !== null &&
	objectPartSelection.kind === TEXT_SLOT_PART_KIND;
