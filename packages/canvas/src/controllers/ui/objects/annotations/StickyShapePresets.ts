import { StickyIcon } from "./StickyIcon";
import type { ShapePreset } from "../types/ShapePreset";

export const StickyShapePresets: ShapePreset[] = [
	{
		id: "sticky",
		objectType: "sticky",
		label: "Sticky",
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
