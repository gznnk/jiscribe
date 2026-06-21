import type { ShapePreset } from "../../types/ShapePreset";

export const StickyShapePresets: ShapePreset[] = [
	{
		id: "sticky",
		objectType: "sticky",
		label: "Sticky",
		order: 50,
		defaultOverrides: {
			width: 200,
			height: 150,
			textAlign: "left",
			verticalAlign: "top",
		},
	},
];
