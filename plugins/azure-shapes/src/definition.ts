import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import {
	calcBelowLabelTextRegion,
	calcBelowLabelVisualBounds,
	createFrameObjectDefinition,
} from "@jiscribe/canvas-sdk";

import { azureIconDocDefinition } from "./doc";
import { AzureIcon } from "./presentation/AzureIcon";
import type { AzureIconDoc } from "./schema/AzureIconDoc";
import { azureIconCatalog } from "./schema/icon/azureIconCatalog";
import type { AzureIconState } from "./state/AzureIconState";
import { AzureIconStencils } from "./stencil/AzureIconStencils";

/**
 * The label hangs outside the box (below it), so without a declared
 * `visualBounds` zoom-to-fit and the export viewBox would crop it away.
 *
 * The menu offers no stroke and no fill (the features carry neither):
 * Microsoft's terms forbid changing the icons. Nor does it offer the icon:
 * which one a shape draws is chosen by the stencil it is placed from
 * (azureStencilCategory).
 */
export const azureIconDefinition: ObjectTypeDefinition<
	AzureIconDoc,
	AzureIconState
> = createFrameObjectDefinition<AzureIconDoc, AzureIconState>({
	doc: azureIconDocDefinition,
	component: AzureIcon,
	textRegion: calcBelowLabelTextRegion,
	visualBounds: calcBelowLabelVisualBounds,
	// The same resolution the doc validation runs: a name no document may carry
	// does not reach the drawing through a state either.
	isExtraStateValid: (state) =>
		state.icon === undefined ||
		(typeof state.icon === "string" &&
			azureIconCatalog.isKnownName(state.icon)),
	stencils: AzureIconStencils,
	menu: [{ id: "text", items: [{ type: "font" }, { type: "textFormat" }] }],
});
