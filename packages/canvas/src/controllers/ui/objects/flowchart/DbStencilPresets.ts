import { DbIcon } from "./DbIcon";
import type { StencilPreset } from "../StencilPreset";

export const DbStencilPresets: StencilPreset[] = [
	{
		id: "db",
		objectType: "db",
		label: { en: "Database", ja: "データベース" },
		categories: { flowchart: 70 },
		icon: DbIcon,
	},
];
