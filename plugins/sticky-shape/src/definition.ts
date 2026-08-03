import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameBehavior } from "@workspace/canvas/unstable";

import { stickyDocDefinition } from "./doc";
import { StickyColorMenu } from "./menu/StickyColorMenu";
import { Sticky } from "./presentation/Sticky";
import { StickyDefs } from "./presentation/StickyDefs";
import type { StickyDoc } from "./schema/StickyDoc";
import { stickyToDoc, stickyToState } from "./state/StickyMapper";
import type { StickyState } from "./state/StickyState";
import { isValidStickyState } from "./state/validateStickyState";
import { StickyStencils } from "./stencil/StickyStencils";

/**
 * The menu is declared rather than derived from features because the paper color
 * replaces the generic fill picker; the rest (text styling, aspect ratio) matches
 * what the default menu would give a `fill` + `body` type.
 */
export const stickyDefinition: ObjectTypeDefinition<StickyDoc, StickyState> = {
	...stickyDocDefinition,
	mapper: { toDoc: stickyToDoc, toState: stickyToState },
	stateValidator: isValidStickyState,
	component: Sticky,
	svgDefs: StickyDefs,
	behavior: createFrameBehavior<StickyState>(),
	stencils: StickyStencils,
	menu: [
		{
			id: "style",
			items: [
				{ type: "custom", id: "sticky-color", component: StickyColorMenu },
			],
		},
		{
			id: "text",
			items: [{ type: "fontStyle" }, { type: "textAlignment" }],
		},
		{
			id: "transform",
			items: [{ type: "aspectRatio" }],
		},
	],
};
