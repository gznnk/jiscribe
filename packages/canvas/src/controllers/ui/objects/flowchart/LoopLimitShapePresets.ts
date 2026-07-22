import { LoopLimitIcon } from "./LoopLimitIcon";
import type { ShapePreset } from "../ShapePreset";

export const LoopLimitShapePresets: ShapePreset[] = [
	{
		id: "loopLimit",
		objectType: "loopLimit",
		label: { en: "Loop Limit", ja: "ループ端" },
		categories: { flowchart: 160 },
		icon: LoopLimitIcon,
	},
];
