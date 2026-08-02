import type { Stencil } from "@workspace/canvas";

import { QueueIcon } from "./QueueIcon";

export const QueueStencils: Stencil[] = [
	{
		id: "queue",
		objectType: "queue",
		label: { en: "Queue", ja: "キュー" },
		icon: QueueIcon,
	},
];
