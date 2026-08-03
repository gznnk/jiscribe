import type { Stencil } from "@workspace/canvas";

import { CalloutIcon } from "./CalloutIcon";

export const CalloutStencils: Stencil[] = [
	{
		id: "callout",
		objectType: "callout",
		label: { en: "Callout", ja: "吹き出し" },
		icon: CalloutIcon,
	},
];
