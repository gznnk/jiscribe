import { HexagonIcon } from "./HexagonIcon";
import type { ShapePreset } from "../ShapePreset";

export const HexagonShapePresets: ShapePreset[] = [
	{
		id: "hexagon",
		objectType: "hexagon",
		label: { en: "Preparation", ja: "準備" },
		categories: { flowchart: 140 },
		icon: HexagonIcon,
	},
];
