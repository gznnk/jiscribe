import type { Stencil } from "@workspace/canvas";

import { ManualInputIcon } from "./ManualInputIcon";

export const ManualInputStencils: Stencil[] = [
	{
		id: "manualInput",
		objectType: "manualInput",
		label: { en: "Manual Input", ja: "手動入力" },
		icon: ManualInputIcon,
	},
];
