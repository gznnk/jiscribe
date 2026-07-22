import { ManualInputIcon } from "./ManualInputIcon";
import type { ShapePreset } from "../ShapePreset";

export const ManualInputShapePresets: ShapePreset[] = [
	{
		id: "manualInput",
		objectType: "manualInput",
		label: { en: "Manual Input", ja: "手動入力" },
		categories: { flowchart: 90 },
		icon: ManualInputIcon,
	},
];
