import { StadiumIcon } from "./StadiumIcon";
import type { StencilPreset } from "../StencilPreset";

export const StadiumStencilPresets: StencilPreset[] = [
	{
		id: "stadium",
		objectType: "stadium",
		label: { en: "Terminal", ja: "端子" },
		categories: { flowchart: 30 },
		icon: StadiumIcon,
	},
];
