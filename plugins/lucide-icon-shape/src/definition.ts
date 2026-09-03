import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import { createFrameObjectDefinition } from "@jiscribe/canvas-sdk";

import { lucideIconDocDefinition } from "./doc";
import { IconPickerMenu } from "./menu/IconPickerMenu";
import { Icon } from "./presentation/Icon";
import { isKnownIconName } from "./schema/icon/resolveIconName";
import type { IconDoc } from "./schema/IconDoc";
import { IconExtraStyleProperties } from "./schema/IconDoc";
import type { IconState } from "./state/IconState";
import { IconStencils } from "./stencil/IconStencils";

/**
 * The menu adds the icon picker to what features would derive on their own: `stroke`
 * without `fill` yields the line color and line style the icon is drawn with, and
 * `transform` yields the aspect-ratio lock that keeps a resized box square. The picker
 * writes `icon`, which the doc declares as an extra style property.
 */
export const lucideIconDefinition: ObjectTypeDefinition<IconDoc, IconState> =
	createFrameObjectDefinition<IconDoc, IconState>({
		doc: lucideIconDocDefinition,
		component: Icon,
		// The same resolution the doc validator applies, so a name that could not be
		// written to a document cannot reach the renderer through a state either.
		isExtraStateValid: (state) =>
			state.icon === undefined ||
			(typeof state.icon === "string" && isKnownIconName(state.icon)),
		extraStyleProperties: IconExtraStyleProperties,
		stencils: IconStencils,
		menu: [
			{
				id: "lucide-icon",
				items: [{ type: "custom", id: "icon", component: IconPickerMenu }],
			},
			{ id: "line", items: [{ type: "lineColor" }, { type: "lineStyle" }] },
			{ id: "transform", items: [{ type: "aspectRatio" }] },
		],
	});
