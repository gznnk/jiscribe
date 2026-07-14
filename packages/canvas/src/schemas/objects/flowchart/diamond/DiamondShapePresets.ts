import type { ShapePreset } from "../../types/ShapePreset";

export const DiamondShapePresets: ShapePreset[] = [
	{
		id: "diamond",
		objectType: "diamond",
		// Labelled "Decision" for its flowchart role; the type stays the generic
		// geometric `diamond` (it only ever appears in the flowchart category).
		label: "Decision",
		categories: { flowchart: 20 },
	},
];
