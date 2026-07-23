import { DisplayIcon } from "./DisplayIcon";
import type { StencilPreset } from "../StencilPreset";

export const DisplayStencilPresets: StencilPreset[] = [
	{
		id: "display",
		objectType: "display",
		label: { en: "Display", ja: "表示" },
		icon: DisplayIcon,
		categories: { flowchart: 80 },
	},
];
