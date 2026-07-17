import { DisplayIcon } from "./DisplayIcon";
import type { ShapePreset } from "../types/ShapePreset";

export const DisplayShapePresets: ShapePreset[] = [
	{
		id: "display",
		objectType: "display",
		label: "Display",
		categories: { flowchart: 80 },
		icon: DisplayIcon,
	},
];
