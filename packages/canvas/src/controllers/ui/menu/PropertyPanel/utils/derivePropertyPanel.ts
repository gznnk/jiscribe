import { appendPropertyPanelItems } from "./appendPropertyPanelItems";
import { createDefaultPropertyPanel } from "./createDefaultPropertyPanel";
import type { AnyObjectTypeDefinition } from "../../../../../plugin/ObjectTypeDefinition";
import { supportsAutoHeightType } from "../../../../../plugin/supportsAutoHeightType";
import { PROPERTY_PANEL_SECTIONS } from "../propertyPanelSections";
import type { PropertyPanelSection } from "../PropertyPanelTypes";

/**
 * The properties-sidebar sections a type is registered with: the ones it
 * declares, or the ones its features imply (`createDefaultPropertyPanel`), plus
 * the auto-height and vertical-basis switches.
 *
 * Those two are offered in the sidebar alone and appended here rather than
 * declared per type: each belongs to every type whose declarations imply it, and
 * a type declaring its own sections would otherwise have to remember them. Each
 * is a row rather than a section of its own, unlike the ObjectMenu's: the
 * sidebar's merge drops individual rows a selected type lacks, so the switch can
 * sit beside the properties it belongs with without endangering them.
 *
 * Appended after whichever sections were chosen, declared or derived, so a type
 * stating its own sidebar still gets them. The auto-height verdict needs the
 * whole definition besides, which `createDefaultPropertyPanel` does not see.
 *
 * @param definition - The type's UI definition; `propertyPanel` and `features` decide the sections, the rest only through the auto-height predicate
 * @returns The sections in display order, auto-height appended before the vertical basis
 */
export const derivePropertyPanel = (
	definition: AnyObjectTypeDefinition,
): PropertyPanelSection[] => {
	let sections =
		definition.propertyPanel ?? createDefaultPropertyPanel(definition.features);
	if (supportsAutoHeightType(definition)) {
		sections = appendPropertyPanelItems(
			sections,
			PROPERTY_PANEL_SECTIONS.layout,
			{ type: "autoHeight" },
		);
	}
	// The basis governs what the vertical alignment in the text section is
	// measured against, so it follows it.
	if (definition.features.textVerticalBasis) {
		sections = appendPropertyPanelItems(
			sections,
			PROPERTY_PANEL_SECTIONS.text,
			{ type: "textVerticalBasis" },
		);
	}
	return sections;
};
