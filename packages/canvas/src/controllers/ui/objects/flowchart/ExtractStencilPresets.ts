import { ExtractIcon } from "./ExtractIcon";
import type { StencilPreset } from "../StencilPreset";

export const ExtractStencilPresets: StencilPreset[] = [
	{
		id: "extract",
		objectType: "extract",
		label: { en: "Extract", ja: "抽出" },
		icon: ExtractIcon,
		categories: { flowchart: 170 },
	},
];
