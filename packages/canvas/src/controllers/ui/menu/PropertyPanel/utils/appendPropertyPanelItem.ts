import type {
	PropertyPanelItem,
	PropertyPanelSection,
} from "../PropertyPanelTypes";

/**
 * The sidebar sections with one more row at the end of the named section,
 * created as a section of its own at the end when no section carries that id.
 *
 * @param sections - The sections in display order; left untouched, a new array is returned
 * @param section - Names the section to append to by `id`; `label` is read only when the section has to be created
 * @param item - The row to put last, a built-in kind or a custom one
 * @returns The sections in the same order, the named one (or a new last one) holding `item`
 */
export const appendPropertyPanelItem = (
	sections: readonly PropertyPanelSection[],
	section: { id: string; label: string },
	item: PropertyPanelItem,
): PropertyPanelSection[] => {
	if (!sections.some((candidate) => candidate.id === section.id)) {
		return [
			...sections,
			{ id: section.id, label: section.label, items: [item] },
		];
	}
	return sections.map((candidate) =>
		candidate.id === section.id
			? { ...candidate, items: [...candidate.items, item] }
			: candidate,
	);
};
