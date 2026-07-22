import { CloudIcon } from "./CloudIcon";
import type { ShapePreset } from "../ShapePreset";

export const CloudShapePresets: ShapePreset[] = [
	{
		id: "cloud",
		objectType: "cloud",
		label: { en: "Cloud", ja: "雲" },
		categories: { general: 10 },
		icon: CloudIcon,
	},
];
