import { MarkdownRectIcon } from "./MarkdownRectIcon";
import { RectIcon } from "./RectIcon";
import { AUTO_COLOR } from "../../../../schemas/objects/utils/autoColor";
import type { Stencil } from "../Stencil";

export const RectStencils: Stencil[] = [
	{
		id: "rect",
		objectType: "rect",
		label: { en: "Rectangle", ja: "長方形" },
		icon: RectIcon,
	},
	{
		// Flowchart process box: a plain rectangle. It renders identically to
		// `rect`, so it stays the same type and only differs as a palette preset
		// (semantic label), not a distinct shape type. Listed via the
		// plugin-supplied flowchart category entry (flowchartToolbarEntry).
		id: "process",
		objectType: "rect",
		label: { en: "Process", ja: "処理" },
		icon: RectIcon,
		defaultOverrides: { width: 140, height: 80 },
	},
	{
		id: "rect-markdown",
		objectType: "rect",
		label: { en: "Markdown", ja: "Markdown" },
		icon: MarkdownRectIcon,
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
