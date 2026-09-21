import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";

import { acceptsTextEmphasisStyle } from "../../utils/acceptsTextEmphasisStyle";
import { PROPERTY_PANEL_SECTIONS } from "../propertyPanelSections";
import type {
	PropertyPanelItem,
	PropertyPanelSection,
} from "../PropertyPanelTypes";

/**
 * Derives the default properties-sidebar sections from an object type's
 * ObjectFeatures, used when a definition omits `propertyPanel` (see
 * ObjectTypeDefinition).
 *
 * The two switches the features cannot answer for are not here: auto height is
 * offered per type by `supportsAutoHeightType` and inserted at registration
 * (applyObjectDefinition), and the text-layout switch belongs to the `text` type
 * alone, which declares it. Neither has a counterpart in the ObjectMenu.
 *
 * @param features - The type's declaration; `transform`, `geometry`, `fill`, `stroke`, `radius`, `arrow` and `text` are read
 * @returns The sections in display order, each labelled with the English wording
 *   its message key carries; the text section leaves the format row out for a
 *   type accepting no emphasis field ({@link acceptsTextEmphasisStyle})
 */
export const createDefaultPropertyPanel = (
	features: ObjectFeatures,
): PropertyPanelSection[] => {
	const sections: PropertyPanelSection[] = [];

	if (features.transform) {
		// A point's box is measured from its content and offers no resize, so
		// neither a stated size nor the aspect-ratio lock would govern anything;
		// it still sits and turns somewhere.
		const items: PropertyPanelItem[] =
			features.geometry === "point"
				? [{ type: "position" }, { type: "rotation" }]
				: [
						{ type: "position" },
						{ type: "size" },
						{ type: "rotation" },
						{ type: "lockAspectRatio" },
					];
		sections.push({ ...PROPERTY_PANEL_SECTIONS.layout, items });
	}
	if (features.fill) {
		sections.push({
			...PROPERTY_PANEL_SECTIONS.fill,
			items: [{ type: "fill" }, { type: "fillOpacity" }],
		});
	}
	if (features.stroke) {
		const items: PropertyPanelItem[] = [
			{ type: "strokeColor" },
			{ type: "strokeWidth" },
			{ type: "strokeDashType" },
			{ type: "strokeOpacity" },
		];
		if (features.fill) {
			if (features.radius) {
				items.push({ type: "radius" });
			}
			sections.push({ ...PROPERTY_PANEL_SECTIONS.stroke, items });
		} else {
			sections.push({ ...PROPERTY_PANEL_SECTIONS.line, items });
		}
	}
	if (features.arrow) {
		sections.push({
			...PROPERTY_PANEL_SECTIONS.arrow,
			items: [{ type: "arrowHeads" }],
		});
	}
	if (features.text) {
		const items: PropertyPanelItem[] = [
			{ type: "fontFamily" },
			{ type: "fontSize" },
			{ type: "fontColor" },
			// The row writes the emphasis fields and nothing else, so a type that
			// accepts none of them has no use for it.
			...(acceptsTextEmphasisStyle(features.text)
				? [{ type: "textFormat" } as PropertyPanelItem]
				: []),
			{ type: "textAlign" },
		];
		// A point's height is measured from its own text, so no vertical value has
		// slack to move through; the horizontal row stays because a short line
		// still shifts inside the box its longest line widened.
		if (features.geometry !== "point") {
			items.push({ type: "verticalAlign" });
		}
		sections.push({ ...PROPERTY_PANEL_SECTIONS.text, items });
	}

	return sections;
};
