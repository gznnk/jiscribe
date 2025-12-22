import type { StickyData } from "../../../types/data/diagrams/StickyData";
import { StickyFeatures } from "../../../types/data/diagrams/StickyData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default data values for Sticky
 */
export const StickyDefaultData: StickyData = CreateDefaultData<StickyData>({
	type: "Sticky",
	options: StickyFeatures,
	properties: {
		width: 160,
		height: 120,
		fill: "#fef9c3",
		stroke: "#fef9c3",
		strokeWidth: 1,
		text: "Sticky Note",
		fontSize: 14,
		fontColor: "#000000",
		fontWeight: "normal",
		textAlign: "left",
		verticalAlign: "start",
	},
});
