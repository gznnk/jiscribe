import { DisplayIcon } from "./DisplayIcon";
import type { ShapePreset } from "../ShapePreset";

export const DisplayShapePresets: ShapePreset[] = [
	{
		id: "display",
		objectType: "display",
		label: { en: "Display", ja: "表示" },
		categories: { flowchart: 80 },
		icon: DisplayIcon,
	},
];
