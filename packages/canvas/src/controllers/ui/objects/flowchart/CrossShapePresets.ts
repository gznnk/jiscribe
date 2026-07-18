import { CrossIcon } from "./CrossIcon";
import type { ShapePreset } from "../ShapePreset";

export const CrossShapePresets: ShapePreset[] = [
	{
		id: "cross",
		objectType: "cross",
		label: "Junction",
		categories: { flowchart: 180 },
		icon: CrossIcon,
	},
];
