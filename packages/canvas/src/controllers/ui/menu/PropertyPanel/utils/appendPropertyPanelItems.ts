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
