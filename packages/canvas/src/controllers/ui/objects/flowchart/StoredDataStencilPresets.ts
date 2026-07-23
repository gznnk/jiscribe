import { StoredDataIcon } from "./StoredDataIcon";
import type { StencilPreset } from "../StencilPreset";

export const StoredDataStencilPresets: StencilPreset[] = [
	{
		id: "storedData",
		objectType: "storedData",
		label: { en: "Stored Data", ja: "記憶データ" },
		categories: { flowchart: 75 },
		icon: StoredDataIcon,
	},
];
