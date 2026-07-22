import { StadiumIcon } from "./StadiumIcon";
import type { ShapePreset } from "../ShapePreset";

export const StadiumShapePresets: ShapePreset[] = [
	{
		id: "stadium",
		objectType: "stadium",
		label: { en: "Terminal", ja: "端子" },
		categories: { flowchart: 30 },
		icon: StadiumIcon,
	},
];
