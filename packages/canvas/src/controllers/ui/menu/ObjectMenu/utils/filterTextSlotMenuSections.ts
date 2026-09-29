import type { BuiltinItemKey, ObjectMenuSection } from "../ObjectMenuTypes";

/** Builtin item types whose update lands on the selected slot rather than the whole object. */
const TEXT_SLOT_ITEM_KEYS: ReadonlySet<BuiltinItemKey> = new Set([
	"font",
	"textFormat",
	"textAlignment",
]);

/**
 * Narrows menu sections down to the items that operate on a selected text slot.
 * A custom item is kept only where it declares itself `slotAware`, that being a
 * plugin item's one way of saying its write lands on the slot rather than on the
 * object; every other one goes with the builtins outside the set above. Sections
 * left empty are removed so no divider survives on its own.
 */
export const filterTextSlotMenuSections = (
	sections: ObjectMenuSection[],
): ObjectMenuSection[] =>
	sections
		.map((section) => ({
			id: section.id,
			items: section.items.filter((item) =>
				item.type === "custom"
					? item.slotAware === true
					: TEXT_SLOT_ITEM_KEYS.has(item.type),
			),
		}))
		.filter((section) => section.items.length > 0);
