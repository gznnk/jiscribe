import type {
	PropertyPanelItem,
	PropertyPanelSection,
} from "../PropertyPanelTypes";

/**
 * The sidebar sections with one or more rows at the end of the named section,
 * created as a section of its own at the end when no section carries that id.
 *
 * @param sections - The sections in display order; left untouched, a new array is returned
 * @param section - Names the section to append to by `id`; `label` is read only when the section has to be created
 * @param items - The rows to put last, in the order they are to be drawn; built-in kinds or custom ones. At least one is required, so a created section never stands as a heading over nothing
 * @returns The sections in the same order, the named one (or a new last one) holding `items`
 */
export const appendPropertyPanelItems = (
	sections: readonly PropertyPanelSection[],
	section: { id: string; label: string },
	...items: [PropertyPanelItem, ...PropertyPanelItem[]]
): PropertyPanelSection[] => {
	if (!sections.some((candidate) => candidate.id === section.id)) {
		return [...sections, { id: section.id, label: section.label, items }];
	}
	return sections.map((candidate) =>
		candidate.id === section.id
			? { ...candidate, items: [...candidate.items, ...items] }
			: candidate,
	);
};

/**
 * Identity of a row wherever two lists of them are reconciled: the discriminator
 * for a built-in kind, the declared id for a plugin's own row.
 *
 * @param item - The row to name; a built-in kind or a custom one
 * @returns The key; a custom row's id is taken as written, so a plugin spelling it like a built-in kind collides with it
 */
export const propertyPanelItemKey = (item: PropertyPanelItem): string =>
	item.type === "custom" ? item.id : item.type;

/**
 * The sidebar sections with the named section holding every one of the given
 * rows, appending only those it does not already carry.
 *
 * The counterpart of {@link appendPropertyPanelItems} for a row that may already
 * have arrived from the type's own declaration: appending it a second time would
 * draw it twice and collide on the React key the panel draws built-in rows by.
 *
 * @param sections - The sections in display order; left untouched, a new array is returned
 * @param section - Names the section to complete by `id`; `label` is read only when the section has to be created
 * @param items - The rows the section is to hold, in the order the missing ones are to be drawn; at least one is required. A row already in the section keeps its place and its declared form
 * @returns The sections in the same order, the named one (or a new last one) holding `items`
 */
export const ensurePropertyPanelItems = (
	sections: readonly PropertyPanelSection[],
	section: { id: string; label: string },
	...items: [PropertyPanelItem, ...PropertyPanelItem[]]
): PropertyPanelSection[] => {
	const target = sections.find((candidate) => candidate.id === section.id);
	if (target === undefined) {
		return appendPropertyPanelItems(sections, section, ...items);
	}
	const heldKeys = new Set(
		target.items.map((item) => propertyPanelItemKey(item)),
	);
	const missing = items.filter(
		(item) => !heldKeys.has(propertyPanelItemKey(item)),
	);
	if (missing.length === 0) {
		return [...sections];
	}
	return sections.map((candidate) =>
		candidate === target
			? { ...candidate, items: [...candidate.items, ...missing] }
			: candidate,
	);
};
