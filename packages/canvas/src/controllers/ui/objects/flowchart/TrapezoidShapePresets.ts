import { TrapezoidIcon } from "./TrapezoidIcon";
import type { ShapePreset } from "../ShapePreset";

export const TrapezoidShapePresets: ShapePreset[] = [
	{
		id: "trapezoid",
		objectType: "trapezoid",
		label: { en: "Manual Operation", ja: "手操作" },
		categories: { flowchart: 130 },
		icon: TrapezoidIcon,
	},
];
