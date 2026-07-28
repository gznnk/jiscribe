import type { Stencil } from "@workspace/canvas";

import { RecordIcon } from "./RecordIcon";

export const RecordStencils: Stencil[] = [
	{
		id: "record",
		objectType: "record",
		label: { en: "Record", ja: "区画付きボックス" },
		icon: RecordIcon,
	},
];
