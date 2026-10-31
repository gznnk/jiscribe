import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import { createFrameObjectDefinition } from "@jiscribe/canvas-sdk";

import { stickyDocDefinition } from "./doc";
import { StickyColorMenu } from "./menu/StickyColorMenu";
import { Sticky } from "./presentation/Sticky";
import { StickyDefs } from "./presentation/StickyDefs";
import { StickyColorProperty } from "./propertyPanel/StickyColorProperty";
import type { StickyDoc } from "./schema/StickyDoc";
import type { StickyState } from "./state/StickyState";
import { StickyStencils } from "./stencil/StickyStencils";

/**
 * The menu is declared rather than derived from features because the paper color
 * replaces the generic fill picker; the rest (text styling) matches what the
 * default menu would give a `fill` + `body` type. `propertyPanel` states what
 * createDefaultPropertyPanel derives from StickyFeatures, with the fill row
 * swapped for the same palette laid out inline.
 */
export const stickyDefinition: ObjectTypeDefinition<StickyDoc, StickyState> =
	createFrameObjectDefinition<StickyDoc, StickyState>({
		doc: stickyDocDefinition,
		component: Sticky,
		svgDefs: StickyDefs,
		stencils: StickyStencils,
		propertyPanel: [
			{
				id: "layout",
				label: "Layout",
				items: [
					{ type: "position" },
					{ type: "size" },
					{ type: "rotation" },
					{ type: "lockAspectRatio" },
				],
			},
			{
				id: "fill",
				label: "Fill",
				items: [
					{
						type: "custom",
						id: "sticky-color",
						component: StickyColorProperty,
					},
					{ type: "fillOpacity" },
				],
			},
			{
				id: "text",
				label: "Text",
				items: [
					{ type: "fontFamily" },
					{ type: "fontSize" },
					{ type: "fontColor" },
					{ type: "textFormat" },
					{ type: "textAlign" },
					{ type: "verticalAlign" },
				],
			},
		],
		menu: [
			{
				id: "style",
				items: [
					{ type: "custom", id: "sticky-color", component: StickyColorMenu },
				],
			},
			{
				id: "text",
				items: [
					{ type: "font" },
					{ type: "textFormat" },
					{ type: "textAlignment" },
				],
			},
		],
	});
