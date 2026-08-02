import type { Stencil } from "@workspace/canvas";

import { LockIcon } from "./LockIcon";

export const LockStencils: Stencil[] = [
	{
		id: "lock",
		objectType: "lock",
		label: { en: "Lock", ja: "錠" },
		icon: LockIcon,
	},
];
