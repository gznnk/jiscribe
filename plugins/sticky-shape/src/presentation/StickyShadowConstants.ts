/**
 * The paper's drop shadow: a blurred trapezoid drawn under the body, wider at
 * the bottom so the note reads as curling up off the board. The offsets are in
 * the shape's local units (its center as origin) and are not scaled with the
 * note, so a small and a large sticky lift by the same amount.
 */

/** Shadow paint. Kept faint enough to survive on a dark board as well. */
export const STICKY_SHADOW_FILL = "rgba(0,0,0,0.08)";

/**
 * Horizontal offset of the trapezoid's corners: the top edge is inset by this
 * much, the bottom edge spread by the same, giving the shadow its taper.
 */
export const STICKY_SHADOW_TAPER = 3;

/** How far past the bottom edge of the paper the shadow falls. */
export const STICKY_SHADOW_DROP = 5;

/** `stdDeviation` of the blur behind the shadow (see {@link STICKY_SHADOW_FILTER_ID}). */
export const STICKY_SHADOW_BLUR = 2;

/**
 * id of the blur filter this type contributes to the canvas-wide `<defs>`.
 * Prefixed with the type name because `<defs>` ids are document-global
 * (`ObjectTypeDefinition.svgDefs`).
 */
export const STICKY_SHADOW_FILTER_ID = "sticky-blur";
