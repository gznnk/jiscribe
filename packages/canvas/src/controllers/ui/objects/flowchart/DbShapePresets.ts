import { DbIcon } from "./DbIcon";
import type { ShapePreset } from "../ShapePreset";

export const DbShapePresets: ShapePreset[] = [
	{
		id: "db",
		objectType: "db",
		label: "Database",
		categories: { flowchart: 70 },
		icon: DbIcon,
	},
];
