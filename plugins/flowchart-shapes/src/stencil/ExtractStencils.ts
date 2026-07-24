import type { Stencil } from "@workspace/canvas";

import { ExtractIcon } from "./ExtractIcon";

export const ExtractStencils: Stencil[] = [
	{
		id: "extract",
		objectType: "extract",
		label: { en: "Extract", ja: "抽出" },
		icon: ExtractIcon,
	},
];
