import { TrapezoidIcon } from "./TrapezoidIcon";
import type { ShapePreset } from "../ShapePreset";

export const TrapezoidShapePresets: ShapePreset[] = [
	{
		id: "trapezoid",
		objectType: "trapezoid",
		label: "Manual Operation",
		categories: { flowchart: 130 },
		icon: TrapezoidIcon,
	},
];
