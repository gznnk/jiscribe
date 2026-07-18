import { MarkdownRectIcon } from "./MarkdownRectIcon";
import { RectIcon } from "./RectIcon";
import { AUTO_COLOR } from "../../../../schemas/objects/utils/autoColor";
import type { ShapePreset } from "../ShapePreset";

export const RectShapePresets: ShapePreset[] = [
	{
		id: "rect",
		objectType: "rect",
		label: "Rectangle",
		categories: { basic: 10 },
		icon: RectIcon,
	},
	{
		// Flowchart process box: a plain rectangle. It renders identically to
		// `rect`, so it stays the same type and only differs as a palette preset
		// (semantic label + flowchart category), not a distinct shape type.
		id: "process",
		objectType: "rect",
		label: "Process",
		categories: { flowchart: 10 },
		defaultOverrides: { width: 140, height: 80 },
		icon: RectIcon,
	},
	{
		id: "rect-markdown",
		objectType: "rect",
		label: "Markdown",
		categories: { basic: 50 },
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
		icon: MarkdownRectIcon,
	},
];
