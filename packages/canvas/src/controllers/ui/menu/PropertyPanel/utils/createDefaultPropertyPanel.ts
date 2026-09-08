import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";

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
 * alone, which declares it. Both mirror how the ObjectMenu gates the same
 * controls.
 *
 * @param features - The type's declaration; `transform`, `geometry`, `fill`, `stroke`, `radius`, `arrow` and `text` are read
 * @returns The sections in display order, each labelled with the English wording its message key carries
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
		sections.push({ id: "layout", label: "Layout", items });
	}
	if (features.fill) {
		sections.push({ id: "fill", label: "Fill", items: [{ type: "fill" }] });
	}
	if (features.stroke) {
		const items: PropertyPanelItem[] = [
			{ type: "strokeColor" },
			{ type: "strokeWidth" },
			{ type: "strokeDashType" },
		];
		if (features.fill) {
			if (features.radius) {
				items.push({ type: "radius" });
			}
			sections.push({ id: "stroke", label: "Border", items });
		} else {
			sections.push({ id: "line", label: "Line", items });
		}
	}
	if (features.arrow) {
		sections.push({
			id: "arrow",
			label: "Arrows",
			items: [{ type: "arrowHeads" }],
		});
	}
	if (features.text) {
		const items: PropertyPanelItem[] = [
			{ type: "fontFamily" },
			{ type: "fontSize" },
			{ type: "fontColor" },
			{ type: "textFormat" },
			{ type: "textAlign" },
		];
		// A point's height is measured from its own text, so no vertical value has
		// slack to move through; the horizontal row stays because a short line
		// still shifts inside the box its longest line widened.
		if (features.geometry !== "point") {
			items.push({ type: "verticalAlign" });
		}
		sections.push({ id: "text", label: "Text", items });
	}

	return sections;
};
