import type { Stencil } from "@workspace/canvas";

import { ActorIcon } from "./ActorIcon";

export const ActorStencils: Stencil[] = [
	{
		id: "actor",
		objectType: "actor",
		label: { en: "Actor", ja: "アクター" },
		icon: ActorIcon,
	},
];
