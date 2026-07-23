import { LoopLimitIcon } from "./LoopLimitIcon";
import type { StencilPreset } from "../StencilPreset";

export const LoopLimitStencilPresets: StencilPreset[] = [
	{
		id: "loopLimit",
		objectType: "loopLimit",
		label: { en: "Loop Limit", ja: "ループ端" },
		icon: LoopLimitIcon,
		categories: { flowchart: 160 },
	},
];
