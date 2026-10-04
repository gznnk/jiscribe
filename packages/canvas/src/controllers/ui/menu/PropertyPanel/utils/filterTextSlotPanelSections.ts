import { filterTextSlotSections } from "../../utils/filterTextSlotSections";
import { PROPERTY_PANEL_SECTIONS } from "../propertyPanelSections";
import type { PropertyPanelSection } from "../PropertyPanelTypes";

/**
 * Narrows the sidebar sections down to the rows a selected text slot can
 * receive: the text section's built-in rows, that being the one section a slot
 * can take anything from, plus every `custom` row declaring itself `slotAware`
 * wherever it sits — the same declaration the ObjectMenu reads, through the same
 * predicate (filterTextSlotSections).
 *
 * @param sections - The sidebar sections in display order; left untouched
 * @returns The sections a picked slot can receive something from, the emptied ones removed
 */
export const filterTextSlotPanelSections = (
	sections: PropertyPanelSection[],
): PropertyPanelSection[] =>
	filterTextSlotSections(
		sections,
		(_item, section) => section.id === PROPERTY_PANEL_SECTIONS.text.id,
	);
