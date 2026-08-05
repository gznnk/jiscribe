import type { BuiltinItemKey, ObjectMenuSection } from "../ObjectMenuTypes";

/** Builtin item types whose update lands on the selected slot rather than the whole object. */
const TEXT_SLOT_ITEM_KEYS: ReadonlySet<BuiltinItemKey> = new Set([
	"fontStyle",
	"textAlignment",
]);

/**
 * Narrows menu sections down to the items that operate on a selected text slot.
 * Custom items are dropped along with the other builtins, since a plugin item has no
 * way to say it is slot-aware. Sections left empty are removed so no divider survives
 * on its own.
 */
export const filterTextSlotMenuSections = (
	sections: ObjectMenuSection[],
): ObjectMenuSection[] =>
	sections
		.map((section) => ({
			id: section.id,
			items: section.items.filter(
				(item) => item.type !== "custom" && TEXT_SLOT_ITEM_KEYS.has(item.type),
			),
		}))
		.filter((section) => section.items.length > 0);
