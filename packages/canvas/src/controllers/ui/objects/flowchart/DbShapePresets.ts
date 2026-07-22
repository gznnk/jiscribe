import { DbIcon } from "./DbIcon";
import type { ShapePreset } from "../ShapePreset";

export const DbShapePresets: ShapePreset[] = [
	{
		id: "db",
		objectType: "db",
		label: { en: "Database", ja: "データベース" },
		categories: { flowchart: 70 },
		icon: DbIcon,
	},
];
