import { DiamondIcon } from "./DiamondIcon";
import type { ShapePreset } from "../ShapePreset";

export const DiamondShapePresets: ShapePreset[] = [
	{
		id: "diamond",
		objectType: "diamond",
		// Labelled "Decision" for its flowchart role; the type stays the generic
		// geometric `diamond` (it only ever appears in the flowchart category).
		label: { en: "Decision", ja: "判断" },
		categories: { flowchart: 20 },
		icon: DiamondIcon,
	},
];
