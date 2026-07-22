import { ParallelogramIcon } from "./ParallelogramIcon";
import type { ShapePreset } from "../ShapePreset";

export const ParallelogramShapePresets: ShapePreset[] = [
	{
		id: "parallelogram",
		objectType: "parallelogram",
		label: { en: "Data", ja: "データ" },
		categories: { flowchart: 50 },
		icon: ParallelogramIcon,
	},
];
