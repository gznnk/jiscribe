import { filterTextSlotSections } from "../../utils/filterTextSlotSections";
import type { BuiltinItemKey, ObjectMenuSection } from "../ObjectMenuTypes";

/** Builtin item types whose update lands on the selected slot rather than the whole object. */
const TEXT_SLOT_ITEM_KEYS = new Set<string>([
	"font",
	"textFormat",
	"textAlignment",
] satisfies BuiltinItemKey[]);

/**
 * Narrows menu sections down to the items that operate on a selected text slot,
 * reading a `custom` item's `slotAware` through the predicate the properties
 * sidebar is narrowed by as well (filterTextSlotSections); the set above is the
 * menu's own half of it.
 *
 * @param sections - The menu sections in display order; left untouched
 * @returns The sections a picked slot can receive something from, the emptied ones removed
 */
export const filterTextSlotMenuSections = (
	sections: ObjectMenuSection[],
): ObjectMenuSection[] =>
	filterTextSlotSections(sections, (item) =>
		TEXT_SLOT_ITEM_KEYS.has(item.type),
	);
