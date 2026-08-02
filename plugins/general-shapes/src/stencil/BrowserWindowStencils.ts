import type { Stencil } from "@workspace/canvas";

import { BrowserWindowIcon } from "./BrowserWindowIcon";

export const BrowserWindowStencils: Stencil[] = [
	{
		id: "browserWindow",
		objectType: "browserWindow",
		label: { en: "Browser window", ja: "ブラウザ画面" },
		icon: BrowserWindowIcon,
	},
];
