import { CrossIcon } from "./CrossIcon";
import type { StencilPreset } from "../StencilPreset";

export const CrossStencilPresets: StencilPreset[] = [
	{
		id: "cross",
		objectType: "cross",
		label: { en: "Junction", ja: "接合点" },
		icon: CrossIcon,
		categories: { flowchart: 180 },
	},
];
