import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import { createFrameObjectDefinition } from "@jiscribe/canvas-sdk";

import { azureIconDocDefinition } from "./doc";
import { AzureIcon } from "./presentation/AzureIcon";
import type { AzureIconDoc } from "./schema/AzureIconDoc";
import { azureIconCatalog } from "./schema/icon/azureIconCatalog";
import type { AzureIconState } from "./state/AzureIconState";
import { AzureIconStencils } from "./stencil/AzureIconStencils";

/**
 * The label hangs below the box (`features.text: "label"`, which the core
 * places along with the background painted behind it).
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
	// The same resolution the doc validation runs: a name no document may carry
	// does not reach the drawing through a state either.
	isExtraStateValid: (state) =>
		state.icon === undefined ||
		(typeof state.icon === "string" &&
			azureIconCatalog.isKnownName(state.icon)),
	component: AzureIcon,
	stencils: AzureIconStencils,
	// The label's background sits under the section id every label type's
	// does, so selecting this beside another label type keeps it.
	menu: [
		{ id: "label-style", items: [{ type: "labelBackgroundColor" }] },
		{ id: "text", items: [{ type: "font" }, { type: "textFormat" }] },
	],
});
