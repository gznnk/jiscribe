import type { Stencil } from "@workspace/canvas";

import { EnvelopeIcon } from "./EnvelopeIcon";

export const EnvelopeStencils: Stencil[] = [
	{
		id: "envelope",
		objectType: "envelope",
		label: { en: "Envelope", ja: "封筒" },
		icon: EnvelopeIcon,
	},
];
