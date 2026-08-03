import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { STICKY_DOC_DEFAULTS } from "./StickyDoc";

/**
 * Factory that creates Sticky shapes (shared Frame logic generated from defaults).
 * Stickies are only center-placed on click (no bounds drawing).
 */
export const StickyObjectFactory = createFrameObjectFactory(
	STICKY_DOC_DEFAULTS,
	{
		supportsBounds: false,
	},
);
