import type { Stencil } from "@workspace/canvas";

import { DisplayIcon } from "./DisplayIcon";

export const DisplayStencils: Stencil[] = [
	{
		id: "display",
		objectType: "display",
		label: { en: "Display", ja: "表示" },
		icon: DisplayIcon,
	},
];
