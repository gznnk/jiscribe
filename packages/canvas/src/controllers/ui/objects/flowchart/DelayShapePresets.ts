import { DelayIcon } from "./DelayIcon";
import type { ShapePreset } from "../ShapePreset";

export const DelayShapePresets: ShapePreset[] = [
	{
		id: "delay",
		objectType: "delay",
		label: { en: "Delay", ja: "遅延" },
		categories: { flowchart: 150 },
		icon: DelayIcon,
	},
];
