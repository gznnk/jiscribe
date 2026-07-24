import type { Stencil } from "@workspace/canvas";

import { StoredDataIcon } from "./StoredDataIcon";

export const StoredDataStencils: Stencil[] = [
	{
		id: "storedData",
		objectType: "storedData",
		label: { en: "Stored Data", ja: "記憶データ" },
		icon: StoredDataIcon,
	},
];
