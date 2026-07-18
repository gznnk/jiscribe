import { ManualInputIcon } from "./ManualInputIcon";
import type { ShapePreset } from "../ShapePreset";

export const ManualInputShapePresets: ShapePreset[] = [
	{
		id: "manualInput",
		objectType: "manualInput",
		label: "Manual Input",
		categories: { flowchart: 90 },
		icon: ManualInputIcon,
	},
];
