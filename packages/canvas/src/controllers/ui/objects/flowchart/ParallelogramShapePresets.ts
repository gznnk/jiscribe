import { ParallelogramIcon } from "./ParallelogramIcon";
import type { ShapePreset } from "../types/ShapePreset";

export const ParallelogramShapePresets: ShapePreset[] = [
	{
		id: "parallelogram",
		objectType: "parallelogram",
		label: "Data",
		categories: { flowchart: 50 },
		icon: ParallelogramIcon,
	},
];
