import { CrossIcon } from "./CrossIcon";
import type { ShapePreset } from "../ShapePreset";

export const CrossShapePresets: ShapePreset[] = [
	{
		id: "cross",
		objectType: "cross",
		label: { en: "Junction", ja: "接合点" },
		categories: { flowchart: 180 },
		icon: CrossIcon,
	},
];
