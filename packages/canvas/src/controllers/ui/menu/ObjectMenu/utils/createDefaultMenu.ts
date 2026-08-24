import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";

import type { ObjectMenuItem, ObjectMenuSection } from "../ObjectMenuTypes";

/**
 * Derives the default ObjectMenu sections from an object type's ObjectFeatures,
 * used when a definition omits `menu` (see ObjectTypeDefinition).
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
		sections.push({
			id: "text",
			items: [{ type: "fontStyle" }, textAlignment],
		});
	}
	// A point's box is measured from its content and offers no resize, so the
	// aspect-ratio lock would govern an operation that does not exist.
	if (features.transform && features.geometry !== "point") {
		sections.push({ id: "transform", items: [{ type: "aspectRatio" }] });
	}

	return sections;
};
