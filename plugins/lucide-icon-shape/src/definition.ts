import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import { createFrameObjectDefinition } from "@jiscribe/canvas-sdk";

import { lucideIconDocDefinition } from "./doc";
import { Icon } from "./presentation/Icon";
import { isKnownIconName } from "./schema/icon/resolveIconName";
import type { IconDoc } from "./schema/IconDoc";
import { IconExtraStyleProperties } from "./schema/IconDoc";
import type { IconState } from "./state/IconState";
import { IconStencils } from "./stencil/IconStencils";

/**
 * The menu is left to be derived from features: `stroke` without `fill` already
 * yields the line color and line style the icon is drawn with, and `transform`
 * yields the aspect-ratio lock that keeps a resized box square.
 *
 * `icon` is declared as an extra style property so a name can be set from the
 * ObjectMenu; the picker that will offer the names is not built yet, and until it is,
 * a name is authored in the document.
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
	});
