import type { Stencil } from "@workspace/canvas";

import { ServerIcon } from "./ServerIcon";

export const ServerStencils: Stencil[] = [
	{
		id: "server",
		objectType: "server",
		label: { en: "Server", ja: "サーバー" },
		icon: ServerIcon,
	},
];
