import { ManualInputIcon } from "./ManualInputIcon";
import type { StencilPreset } from "../StencilPreset";

export const ManualInputStencilPresets: StencilPreset[] = [
	{
		id: "manualInput",
		objectType: "manualInput",
		label: { en: "Manual Input", ja: "手動入力" },
		categories: { flowchart: 90 },
		icon: ManualInputIcon,
	},
];
