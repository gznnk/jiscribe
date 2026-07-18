import { CardIcon } from "./CardIcon";
import type { ShapePreset } from "../ShapePreset";

export const CardShapePresets: ShapePreset[] = [
	{
		id: "card",
		objectType: "card",
		label: "Card",
		categories: { flowchart: 100 },
		icon: CardIcon,
	},
];
