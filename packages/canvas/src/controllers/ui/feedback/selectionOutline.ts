/**
 * Stroke width in world units, shared by every selection outline: the object's own
 * frame (Outline) and the text slot addressed inside it (TextSlotOutline). Not
 * compensated for zoom — the outline scales with the content it wraps.
 */
export const SELECTION_OUTLINE_WIDTH = 1.5;

/**
 * Dash and gap lengths in world units for a dashed selection outline, scaling with
 * zoom like SELECTION_OUTLINE_WIDTH. Dashed marks the object as the context a
 * selection sits inside rather than the target being operated on.
 */
export const SELECTION_OUTLINE_DASH_PATTERN = [4, 3];
