import { StoredDataIcon } from "./StoredDataIcon";
import type { ShapePreset } from "../ShapePreset";

export const StoredDataShapePresets: ShapePreset[] = [
	{
		id: "storedData",
		objectType: "storedData",
		label: { en: "Stored Data", ja: "記憶データ" },
		categories: { flowchart: 75 },
		icon: StoredDataIcon,
	},
];
