import { appendPropertyPanelItem } from "./appendPropertyPanelItem";
import { createDefaultPropertyPanel } from "./createDefaultPropertyPanel";
import { hasInsetTextRegionType } from "../../../../../plugin/hasInsetTextRegionType";
import type { AnyObjectTypeDefinition } from "../../../../../plugin/ObjectTypeDefinition";
import { supportsAutoHeightType } from "../../../../../plugin/supportsAutoHeightType";
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
 * The decision cannot live in `createDefaultPropertyPanel`, which sees `features`
 * alone: both predicates read the whole definition — the auto-height
 * implementation for one, the text region for the other.
 *
 * @param definition - The type's UI definition; `propertyPanel` and `features` decide the sections, the rest only through the two predicates
 * @returns The sections in display order, auto-height appended before the vertical basis
 */
export const derivePropertyPanel = (
	definition: AnyObjectTypeDefinition,
): PropertyPanelSection[] => {
	let sections =
		definition.propertyPanel ?? createDefaultPropertyPanel(definition.features);
	if (supportsAutoHeightType(definition)) {
		sections = appendPropertyPanelItem(
			sections,
			{ id: "layout", label: "Layout" },
			{ type: "autoHeight" },
		);
	}
	// The basis governs what the vertical alignment in the text section is
	// measured against, so it follows it.
	if (hasInsetTextRegionType(definition)) {
		sections = appendPropertyPanelItem(
			sections,
			{ id: "text", label: "Text" },
			{ type: "textVerticalBasis" },
		);
	}
	return sections;
};
