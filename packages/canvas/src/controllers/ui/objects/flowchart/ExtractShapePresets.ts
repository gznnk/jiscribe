import { ExtractIcon } from "./ExtractIcon";
import type { ShapePreset } from "../types/ShapePreset";

export const ExtractShapePresets: ShapePreset[] = [
	{
		id: "extract",
		objectType: "extract",
		label: "Extract",
		categories: { flowchart: 170 },
		icon: ExtractIcon,
	},
];
