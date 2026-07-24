import type { Stencil } from "@workspace/canvas";

import { CardIcon } from "./CardIcon";

export const CardStencils: Stencil[] = [
	{
		id: "card",
		objectType: "card",
		label: { en: "Card", ja: "カード" },
		icon: CardIcon,
	},
];
