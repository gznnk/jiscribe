import type { Stencil } from "@workspace/canvas";

import { StickyIcon } from "./StickyIcon";

export const StickyStencils: Stencil[] = [
	{
		id: "sticky",
		objectType: "sticky",
		label: { en: "Sticky", ja: "付箋" },
		icon: StickyIcon,
		defaultOverrides: {
			width: 200,
			height: 150,
			textAlign: "left",
			verticalAlign: "top",
		},
	},
];
