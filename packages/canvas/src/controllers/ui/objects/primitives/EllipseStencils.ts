import { EllipseIcon } from "./EllipseIcon";
import { OnPageConnectorIcon } from "./OnPageConnectorIcon";
import type { Stencil } from "../Stencil";

export const EllipseStencils: Stencil[] = [
	{
		id: "ellipse",
		objectType: "ellipse",
		label: { en: "Ellipse", ja: "楕円" },
		icon: EllipseIcon,
	},
	{
		// Flowchart on-page connector: an ellipse type reused as a small labelled
		// circle. It renders identically to `ellipse`, so it stays the same type
		// (not a distinct one) and only differs as a palette preset.
		id: "onPageConnector",
		objectType: "ellipse",
		label: { en: "On-page connector", ja: "結合子" },
		icon: OnPageConnectorIcon,
		defaultOverrides: { rx: 32, ry: 32 },
	},
];
