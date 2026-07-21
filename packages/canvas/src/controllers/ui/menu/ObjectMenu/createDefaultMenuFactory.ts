import type {
	MenuItem,
	MenuSection,
	ObjectMenuSectionFactory,
} from "./ObjectMenuTypes";
import type { ObjectFeatures } from "../../../../schemas/objects/types/ObjectFeatures";

/**
 * Derives the default ObjectMenu sections from an object type's ObjectFeatures,
 * used when a definition omits `menuFactory` (see ObjectTypeDefinition).
 */
export const createDefaultMenuFactory = (
	features: ObjectFeatures,
): ObjectMenuSectionFactory => {
	const sections: MenuSection[] = [];

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
		const items: MenuItem[] = [{ type: "backgroundColor" }];
		if (features.stroke) {
			items.push(
				{ type: "borderColor" },
				{ type: "borderStyle", radius: !!features.radius },
			);
		}
		sections.push({ id: "style", items });
	}
	if (features.text) {
		sections.push({
			id: "text",
			items: [{ type: "fontStyle" }, { type: "textAlignment" }],
		});
	}
	if (features.transform) {
		sections.push({ id: "transform", items: [{ type: "aspectRatio" }] });
	}

	return () => sections;
};
