import type { ObjectPartSelection } from "./ObjectPartSelection";

/**
 * The part-id namespace of the text slots a `features.text === "slots"` type
 * spells out, with part ids spelled as the slot keys of the object's `text`.
 * The kind half of the `data-part` its slot elements carry, which `textSlotPart`
 * builds.
 */
export const TEXT_SLOT_PART_KIND = "textSlot";

/**
 * Whether what is picked one level below the object is a text slot. Core
 * registers this one kind for every text slot there is, so comparing the name is
 * the definition itself rather than a lookup standing in for one.
 *
 * @param part - The parts picked one level below the object
 *   (`CanvasSelection.part`), taken as it stands (the reducer has already
 *   dropped one naming something gone, reconcileSelection); null when
 *   none are
 * @returns True only while a slot is picked; false when nothing is picked below
 *   the object, or what is picked is of another kind (a vertex)
 */
export const isTextSlotSelection = (
	part: ObjectPartSelection | null,
): part is ObjectPartSelection =>
	part !== null && part.kind === TEXT_SLOT_PART_KIND;
