import { StoredDataIcon } from "./StoredDataIcon";
import type { ShapePreset } from "../ShapePreset";

export const StoredDataShapePresets: ShapePreset[] = [
	{
		id: "storedData",
		objectType: "storedData",
		label: "Stored Data",
		categories: { flowchart: 75 },
		icon: StoredDataIcon,
	},
];
