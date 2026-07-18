import { HexagonIcon } from "./HexagonIcon";
import type { ShapePreset } from "../types/ShapePreset";

export const HexagonShapePresets: ShapePreset[] = [
	{
		id: "hexagon",
		objectType: "hexagon",
		label: "Preparation",
		categories: { flowchart: 140 },
		icon: HexagonIcon,
	},
];
