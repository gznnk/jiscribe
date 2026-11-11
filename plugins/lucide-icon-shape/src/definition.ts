import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import { createFrameObjectDefinition } from "@jiscribe/canvas-sdk";

import { lucideIconDocDefinition } from "./doc";
import { Icon } from "./presentation/Icon";
import { isKnownIconName } from "./schema/icon/resolveIconName";
import type { IconDoc } from "./schema/IconDoc";
import type { IconState } from "./state/IconState";
import { IconStencils } from "./stencil/IconStencils";

/**
 * The menu is the line color and line style the icon is drawn with (`stroke`
 * without `fill`). It offers no icon: which one a shape draws is chosen by the
 * stencil it is placed from (lucideIconStencilCategory).
 */
export const lucideIconDefinition: ObjectTypeDefinition<IconDoc, IconState> =
	createFrameObjectDefinition<IconDoc, IconState>({
		doc: lucideIconDocDefinition,
		// The same resolution the doc validator applies, so a name that could not be
		// written to a document cannot reach the renderer through a state either.
		isExtraStateValid: (state) =>
			state.icon === undefined ||
			(typeof state.icon === "string" && isKnownIconName(state.icon)),
		component: Icon,
		stencils: IconStencils,
		menu: [
			{ id: "line", items: [{ type: "lineColor" }, { type: "lineStyle" }] },
		],
	});
