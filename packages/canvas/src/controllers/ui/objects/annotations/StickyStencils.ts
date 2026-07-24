import { StickyIcon } from "./StickyIcon";
import type { Stencil } from "../Stencil";

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
