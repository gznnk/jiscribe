import { HexagonIcon } from "./HexagonIcon";
import type { StencilPreset } from "../StencilPreset";

export const HexagonStencilPresets: StencilPreset[] = [
	{
		id: "hexagon",
		objectType: "hexagon",
		label: { en: "Preparation", ja: "準備" },
		categories: { flowchart: 140 },
		icon: HexagonIcon,
	},
];
