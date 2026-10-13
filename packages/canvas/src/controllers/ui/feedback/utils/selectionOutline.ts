/**
 * Stroke width in world units, shared by every selection outline: the object's own
 * frame (Outline) and the parts addressed inside it (ObjectPartOutline). Not
 * compensated for zoom — the outline scales with the content it wraps.
 */
export const SELECTION_OUTLINE_WIDTH = 1.5;
