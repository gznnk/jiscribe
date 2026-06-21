import type { ShapePreset } from "../../types/ShapePreset";
import { AUTO_COLOR } from "../../utils/autoColor";

export const RectShapePresets: ShapePreset[] = [
	{ id: "rect", objectType: "rect", label: "Rectangle", order: 10 },
	{
		id: "rect-markdown",
		objectType: "rect",
		label: "Markdown",
		order: 60,
		defaultOverrides: {
			width: 300,
			height: 200,
			textType: "markdown",
			textAlign: "left",
			verticalAlign: "top",
			fill: AUTO_COLOR,
			stroke: AUTO_COLOR,
			fontColor: AUTO_COLOR,
			text: "# Title\n\nWrite **markdown** here.",
		},
	},
];
