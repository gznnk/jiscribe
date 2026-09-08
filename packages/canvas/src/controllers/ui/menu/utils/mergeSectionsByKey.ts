/**
 * The shape both menus' sections share: an id the merge matches sections by, and
 * the items it AND-merges within a matched pair.
 */
export type KeyedSection<TItem> = {
	id: string;
	items: TItem[];
};

/**
 * AND-merges the section lists of several object types, keeping only what every
 * one of them offers.
 *
 * Shared by the ObjectMenu and the properties sidebar, which differ only in
 * their item shapes: a section id must appear in every list to survive, and
 * inside a surviving section an item key must appear in every one of that
 * section's copies. A section left with no items is dropped, so no divider or
 * accordion header survives on its own.
 *
 * A single list is returned untouched — including the item objects themselves,
 * so a lone type's declaration reaches the UI exactly as it was written.
 *
 * @param sectionArrays - One section list per selected concrete type, in the order they were collected; the first decides the section and item order of the result. An empty outer array yields `[]`
 * @param itemKey - Identity of an item for the merge: the discriminator for a built-in kind, the declared id for a custom one
 * @param mergeItems - Called for each surviving key with that key's item from every list, in `sectionArrays` order, to reconcile the per-type variants of one item (an option one type enables and another does not). Omitted keeps the first list's item as it is
 * @returns Sections carrying every field of the first list's section (its label included) with the merged items
 */
export const mergeSectionsByKey = <TItem, TSection extends KeyedSection<TItem>>(
	sectionArrays: TSection[][],
	itemKey: (item: TItem) => string,
	mergeItems?: (items: TItem[]) => TItem,
): TSection[] => {
	if (sectionArrays.length === 0) {
		return [];
	}
	if (sectionArrays.length === 1) {
		return sectionArrays[0];
	}

	return sectionArrays[0]
		.filter((section) =>
			sectionArrays
				.slice(1)
				.every((sections) => sections.some((s) => s.id === section.id)),
		)
		.map((section) => {
			const itemArrays = sectionArrays.map(
				(sections) => sections.find((s) => s.id === section.id)?.items ?? [],
			);
			const items = itemArrays[0]
				.filter((item) => {
					const key = itemKey(item);
					return itemArrays
						.slice(1)
						.every((candidates) =>
							candidates.some((candidate) => itemKey(candidate) === key),
						);
				})
				.map((item) => {
					if (mergeItems === undefined) {
						return item;
					}
					const key = itemKey(item);
					const variants = itemArrays.flatMap((candidates) => {
						const found = candidates.find(
							(candidate) => itemKey(candidate) === key,
						);
						return found === undefined ? [] : [found];
					});
					return mergeItems(variants);
				});
			return { ...section, items };
		})
		.filter((section) => section.items.length > 0);
};
