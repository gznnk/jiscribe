import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";

import { acceptsTextEmphasisStyle } from "../../utils/acceptsTextEmphasisStyle";
import type { ObjectMenuItem, ObjectMenuSection } from "../ObjectMenuTypes";

/**
 * Derives the default ObjectMenu sections from an object type's ObjectFeatures,
 * used when a definition omits `menu` (see ObjectTypeDefinition).
 *
 * The format toggles are offered only to a text type that accepts the emphasis
 * fields ({@link acceptsTextEmphasisStyle}); the family, size and color the same
 * item carries stay, being fields every text type takes.
 */
export const createDefaultMenu = (
	features: ObjectFeatures,
): ObjectMenuSection[] => {
	const sections: ObjectMenuSection[] = [];

	if (features.arrow) {
		sections.push({ id: "arrowHead", items: [{ type: "arrowHead" }] });
	}
	if (features.stroke && !features.fill) {
		sections.push({
			id: "line",
			items: [{ type: "lineColor" }, { type: "lineStyle" }],
		});
	}
	if (features.fill) {
		const items: ObjectMenuItem[] = [{ type: "backgroundColor" }];
		if (features.stroke) {
			items.push(
				{ type: "borderColor" },
				{ type: "borderStyle", radius: !!features.radius },
			);
		}
		sections.push({ id: "style", items });
	}
	if (features.text) {
		// A point's height is measured from its own text, so no vertical value
		// has slack to move through; the horizontal row stays because a short
		// line still shifts inside the box its longest line widened.
		const textAlignment: ObjectMenuItem =
			features.geometry === "point"
				? { type: "textAlignment", vertical: false }
				: { type: "textAlignment" };
		const fontStyle: ObjectMenuItem = acceptsTextEmphasisStyle(features.text)
			? { type: "fontStyle" }
			: { type: "fontStyle", emphasis: false };
		sections.push({ id: "text", items: [fontStyle, textAlignment] });
	}

	return sections;
};
