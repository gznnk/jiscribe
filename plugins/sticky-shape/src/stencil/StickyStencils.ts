import type { Stencil } from "@workspace/canvas";
import { createTypeStencils } from "@workspace/canvas-sdk";

import { StickyIcon } from "./StickyIcon";

export const StickyStencils: Stencil[] = createTypeStencils({
	objectType: "sticky",
	label: { en: "Sticky", ja: "付箋" },
	icon: StickyIcon,
	defaultOverrides: {
		width: 200,
		height: 150,
		textAlign: "left",
		verticalAlign: "top",
	},
});
