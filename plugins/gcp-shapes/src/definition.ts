import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import {
	calcBelowLabelTextRegion,
	calcBelowLabelVisualBounds,
	createFrameObjectDefinition,
} from "@jiscribe/canvas-sdk";

import { gcpIconDocDefinition } from "./doc";
import { GcpIcon } from "./presentation/GcpIcon";
import type { GcpIconDoc } from "./schema/GcpIconDoc";
import { gcpIconCatalog } from "./schema/icon/gcpIconCatalog";
import type { GcpIconState } from "./state/GcpIconState";
import { GcpIconStencils } from "./stencil/GcpIconStencils";

/**
 * The label hangs outside the box (below it), so without a declared
 * `visualBounds` zoom-to-fit and the export viewBox would crop it away.
 *
 * The menu offers no stroke and no fill (the features carry neither):
 * the icons are redistributed unmodified (LICENSE-ICONS.md). Nor does it
 * offer the icon: which one a shape draws is chosen by the stencil it is
 * placed from (gcpStencilCategory).
 */
export const gcpIconDefinition: ObjectTypeDefinition<GcpIconDoc, GcpIconState> =
	createFrameObjectDefinition<GcpIconDoc, GcpIconState>({
		doc: gcpIconDocDefinition,
		component: GcpIcon,
		textRegion: calcBelowLabelTextRegion,
		visualBounds: calcBelowLabelVisualBounds,
		// The same resolution the doc validation runs: a name no document may carry
		// does not reach the drawing through a state either.
		isExtraStateValid: (state) =>
			state.icon === undefined ||
			(typeof state.icon === "string" &&
				gcpIconCatalog.isKnownName(state.icon)),
		stencils: GcpIconStencils,
		menu: [{ id: "text", items: [{ type: "font" }, { type: "textFormat" }] }],
	});
