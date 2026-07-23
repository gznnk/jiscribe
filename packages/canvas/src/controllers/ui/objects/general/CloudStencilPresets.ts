import { CloudIcon } from "./CloudIcon";
import type { StencilPreset } from "../StencilPreset";

export const CloudStencilPresets: StencilPreset[] = [
	{
		id: "cloud",
		objectType: "cloud",
		label: { en: "Cloud", ja: "雲" },
		categories: { general: 10 },
		icon: CloudIcon,
	},
];
