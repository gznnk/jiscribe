import { LoopLimitIcon } from "./LoopLimitIcon";
import type { ShapePreset } from "../types/ShapePreset";

export const LoopLimitShapePresets: ShapePreset[] = [
	{
		id: "loopLimit",
		objectType: "loopLimit",
		label: "Loop Limit",
		categories: { flowchart: 160 },
		icon: LoopLimitIcon,
	},
];
