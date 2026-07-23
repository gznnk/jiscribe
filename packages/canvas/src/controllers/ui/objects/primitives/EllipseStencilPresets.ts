import { EllipseIcon } from "./EllipseIcon";
import { OnPageConnectorIcon } from "./OnPageConnectorIcon";
import type { StencilPreset } from "../StencilPreset";

export const EllipseStencilPresets: StencilPreset[] = [
	{
		id: "ellipse",
		objectType: "ellipse",
		label: { en: "Ellipse", ja: "楕円" },
		categories: { basic: 20 },
		icon: EllipseIcon,
	},
	{
		// Flowchart on-page connector: an ellipse type reused as a small labelled
		// circle. It renders identically to `ellipse`, so it stays the same type
		// (not a distinct one) and only differs as a palette preset.
		id: "onPageConnector",
		objectType: "ellipse",
		label: { en: "On-page connector", ja: "結合子" },
		categories: { flowchart: 200 },
		defaultOverrides: { rx: 32, ry: 32 },
		icon: OnPageConnectorIcon,
	},
];
