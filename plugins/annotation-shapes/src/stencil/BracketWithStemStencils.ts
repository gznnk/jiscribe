import type { Stencil } from "@workspace/canvas";

import { BracketWithStemIcon } from "./BracketWithStemIcon";

/** One stencil; the drawn proportions pick the axis (BracketWithStemObjectFactory). */
export const BracketWithStemStencils: Stencil[] = [
	{
		id: "bracketWithStem",
		objectType: "bracketWithStem",
		label: { en: "Bracket with stem", ja: "角括弧（枝つき）" },
		icon: BracketWithStemIcon,
	},
];
