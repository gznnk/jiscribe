import { ExtractIcon } from "./ExtractIcon";
import type { StencilPreset } from "../StencilPreset";

export const ExtractStencilPresets: StencilPreset[] = [
	{
		id: "extract",
		objectType: "extract",
		label: { en: "Extract", ja: "抽出" },
		categories: { flowchart: 170 },
		icon: ExtractIcon,
	},
];
