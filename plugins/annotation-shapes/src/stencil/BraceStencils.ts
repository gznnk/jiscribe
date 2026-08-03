import type { Stencil } from "@workspace/canvas";

import { BraceIcon } from "./BraceIcon";

/**
 * One stencil, not one per direction: drag-drawing already picks the axis from
 * the drawn proportions (BraceObjectFactory), so four palette entries would be
 * four ways to reach the same shape.
 */
export const BraceStencils: Stencil[] = [
	{
		id: "brace",
		objectType: "brace",
		label: { en: "Brace", ja: "波括弧" },
		icon: BraceIcon,
	},
];
