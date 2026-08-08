import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameObjectDefinition } from "@workspace/canvas-sdk";

import { stickyDocDefinition } from "./doc";
import { StickyColorMenu } from "./menu/StickyColorMenu";
import { Sticky } from "./presentation/Sticky";
import { StickyDefs } from "./presentation/StickyDefs";
import type { StickyDoc } from "./schema/StickyDoc";
import type { StickyState } from "./state/StickyState";
import { StickyStencils } from "./stencil/StickyStencils";

/**
 * The menu is declared rather than derived from features because the paper color
 * replaces the generic fill picker; the rest (text styling, aspect ratio) matches
 * what the default menu would give a `fill` + `body` type.
 */
export const stickyDefinition: ObjectTypeDefinition<StickyDoc, StickyState> =
	createFrameObjectDefinition<StickyDoc, StickyState>({
		doc: stickyDocDefinition,
		component: Sticky,
		svgDefs: StickyDefs,
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
	});
