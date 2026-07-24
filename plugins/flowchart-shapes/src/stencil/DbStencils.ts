import type { Stencil } from "@workspace/canvas";

import { DbIcon } from "./DbIcon";

export const DbStencils: Stencil[] = [
	{
		id: "db",
		objectType: "db",
		label: { en: "Database", ja: "データベース" },
		icon: DbIcon,
	},
];
