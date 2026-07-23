import { ParallelogramIcon } from "./ParallelogramIcon";
import type { StencilPreset } from "../StencilPreset";

export const ParallelogramStencilPresets: StencilPreset[] = [
	{
		id: "parallelogram",
		objectType: "parallelogram",
		label: { en: "Data", ja: "データ" },
		categories: { flowchart: 50 },
		icon: ParallelogramIcon,
	},
];
