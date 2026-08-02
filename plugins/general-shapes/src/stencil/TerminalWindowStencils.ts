import type { Stencil } from "@workspace/canvas";

import { TerminalWindowIcon } from "./TerminalWindowIcon";

export const TerminalWindowStencils: Stencil[] = [
	{
		id: "terminalWindow",
		objectType: "terminalWindow",
		label: { en: "Terminal", ja: "端末" },
		icon: TerminalWindowIcon,
	},
];
