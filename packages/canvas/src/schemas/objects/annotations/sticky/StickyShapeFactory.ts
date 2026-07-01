import { STICKY_DOC_DEFAULTS } from "./StickyDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/**
 * Factory that creates Sticky shapes (shared Frame logic generated from defaults).
 * Stickies are only center-placed on click (no bounds drawing).
 */
export const StickyShapeFactory = createFrameShapeFactory(STICKY_DOC_DEFAULTS, {
	supportsBounds: false,
});
