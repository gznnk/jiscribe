import type { Stencil } from "@workspace/canvas";

import { BracketIcon } from "./BracketIcon";

/**
 * One stencil, not one per direction: drag-drawing already picks the axis from
 * the drawn proportions (BracketObjectFactory), so four palette entries would be
 * four ways to reach the same shape.
 */
export const BracketStencils: Stencil[] = [
	{
		id: "bracket",
		objectType: "bracket",
		label: { en: "Bracket", ja: "角括弧" },
		icon: BracketIcon,
	},
];
