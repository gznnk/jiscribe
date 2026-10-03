import type { KeyedSection } from "./mergeSectionsByKey";

/**
 * The shape both surfaces' rows share for this narrowing: the discriminator that
 * tells a plugin's own row from a built-in one, and the flag such a row declares
 * itself slot-aware with.
 */
type SlotNarrowableItem = {
	type: string;
	slotAware?: boolean;
};

/**
 * Narrows the sections of a selection down to the rows a picked text slot can
 * receive, so neither surface offers a control the slot cannot take.
 *
 * Shared by the ObjectMenu and the properties sidebar, which have to agree on
 * what a plugin's own row is allowed to do: a `custom` row is kept only where it
 * declares itself `slotAware`, that being its one way of saying its write lands
 * on the slot rather than on the object. Built-in rows are each surface's own
 * vocabulary, so each passes its reading of them in.
 *
 * @param sections - The sections in display order; left untouched, fresh section objects are returned
 * @param isSlotAwareBuiltin - Asked about every non-custom row, together with the
 *   section it sits in, and answers whether a picked slot can receive it. The
 *   section is handed over because a surface may narrow by where a row sits
 *   rather than by what it is (the sidebar's text section)
 * @returns The sections in the same order, carrying every other field they had;
 *   one the filter emptied is dropped, so no divider or accordion header survives
 *   on its own
 */
export const filterTextSlotSections = <
	TItem extends SlotNarrowableItem,
	TSection extends KeyedSection<TItem>,
>(
	sections: readonly TSection[],
	isSlotAwareBuiltin: (item: TItem, section: TSection) => boolean,
): TSection[] =>
	sections
		.map((section) => ({
			...section,
			items: section.items.filter((item) =>
				item.type === "custom"
					? item.slotAware === true
					: isSlotAwareBuiltin(item, section),
			),
		}))
		.filter((section) => section.items.length > 0);
