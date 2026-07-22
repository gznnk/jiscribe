import { StickyIcon } from "./StickyIcon";
import type { ShapePreset } from "../ShapePreset";

export const StickyShapePresets: ShapePreset[] = [
	{
		id: "sticky",
		objectType: "sticky",
		label: { en: "Sticky", ja: "付箋" },
		categories: { annotation: 20 },
		defaultOverrides: {
			width: 200,
			height: 150,
			textAlign: "left",
			verticalAlign: "top",
		},
		icon: StickyIcon,
	},
];
