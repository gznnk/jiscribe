import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import {
	acceptsTextEmphasisStyle,
	hasLabelFill,
	isCaptionText,
} from "@jiscribe/doc/model/objects/types/text/TextType";

import type { ObjectMenuItem, ObjectMenuSection } from "../ObjectMenuTypes";

/**
 * Derives the default ObjectMenu sections from an object type's ObjectFeatures,
 * used when a definition omits `menu` (see ObjectTypeDefinition).
 *
 * The `textFormat` item writes the emphasis fields and nothing else, so it is
 * offered only to a text type that accepts them
 * ({@link acceptsTextEmphasisStyle}); `font` stays either way, carrying fields
 * every text type takes.
 *
 * A `text: "label"` type (hasLabelFill) gets its caption's background under `label-style`, the
 * section id a connector's label background sits under too, so the merge across
 * selected types keeps it for every type offering it there. A caption's
 * (isCaptionText) alignment row offers no vertical values, the caption having no slack to move through.
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
	if (hasLabelFill(features.text)) {
		sections.push({
			id: "label-style",
			items: [{ type: "labelBackgroundColor" }],
		});
	}
	if (features.text) {
		// A point's height and a caption's box are measured from their own text,
		// so no vertical value has slack to move through; the horizontal row stays
		// because a short line still shifts inside the box its longest line widened.
		const textAlignment: ObjectMenuItem =
			features.geometry === "point" || isCaptionText(features.text)
				? { type: "textAlignment", vertical: false }
				: { type: "textAlignment" };
		const items: ObjectMenuItem[] = [{ type: "font" }];
		if (acceptsTextEmphasisStyle(features.text)) {
			items.push({ type: "textFormat" });
		}
		items.push(textAlignment);
		sections.push({ id: "text", items });
	}

	return sections;
};
