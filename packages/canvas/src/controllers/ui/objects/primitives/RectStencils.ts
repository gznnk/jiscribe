import { RectIcon } from "./RectIcon";
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
];
