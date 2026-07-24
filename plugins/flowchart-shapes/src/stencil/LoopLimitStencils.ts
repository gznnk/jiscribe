import type { Stencil } from "@workspace/canvas";

import { LoopLimitIcon } from "./LoopLimitIcon";

export const LoopLimitStencils: Stencil[] = [
	{
		id: "loopLimit",
		objectType: "loopLimit",
		label: { en: "Loop Limit", ja: "ループ端" },
		icon: LoopLimitIcon,
	},
];
