import { CloudIcon } from "./CloudIcon";
import type { StencilPreset } from "../StencilPreset";

export const CloudStencilPresets: StencilPreset[] = [
	{
		id: "cloud",
		objectType: "cloud",
		label: { en: "Cloud", ja: "雲" },
		icon: CloudIcon,
		categories: { general: 10 },
	},
];
