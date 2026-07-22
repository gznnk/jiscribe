import { CardIcon } from "./CardIcon";
import type { ShapePreset } from "../ShapePreset";

export const CardShapePresets: ShapePreset[] = [
	{
		id: "card",
		objectType: "card",
		label: { en: "Card", ja: "カード" },
		categories: { flowchart: 100 },
		icon: CardIcon,
	},
];
