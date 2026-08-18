import { createStencilIcon } from "@jiscribe/canvas-sdk";
import { createElement } from "react";

import { ICON_NODES } from "../schema/icon/iconData.generated";

/**
 * The icon the palette entry wears: one of the set it offers, so it cannot be a drawing
 * the set does not have. A face rather than the obvious `shapes`, whose circle / triangle
 * / square is the application's own mark and reads as "the shape tools" on a toolbar.
 */
const STENCIL_ICON_NAME = "face-slightly-smiling";

export const IconStencilIcon = createStencilIcon(
	<g
		fill="none"
		stroke="currentColor"
		strokeWidth={2}
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		{(ICON_NODES[STENCIL_ICON_NAME] ?? []).map(([tag, attrs], index) =>
			createElement(tag, { key: index, ...attrs }),
		)}
	</g>,
);
