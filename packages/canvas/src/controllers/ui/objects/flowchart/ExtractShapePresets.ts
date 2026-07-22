import { ExtractIcon } from "./ExtractIcon";
import type { ShapePreset } from "../ShapePreset";

export const ExtractShapePresets: ShapePreset[] = [
	{
		id: "extract",
		objectType: "extract",
		label: { en: "Extract", ja: "抽出" },
		categories: { flowchart: 170 },
		icon: ExtractIcon,
	},
];
