/**
 * The paper's drop shadow: the note's own rectangle, dropped a little and given
 * a soft edge — built out of gradients rather than a blur filter. A filter makes
 * the browser rasterize every sticky into its own offscreen surface and redo it
 * on each zoom / pan / drag frame, which is linear in the notes on screen and is
 * what made a board of them crawl (#133); gradient fills cost nothing beyond the
 * rectangles themselves and stay smooth at any zoom.
 *
 * The soft edge is assembled the way `box-shadow` builds one: the sides fade
 * outward with a linear gradient, the corners with a radial one centered on the
 * corner, and the middle stays solid — painted only where it shows below the
 * paper. The light comes from straight above, so the shadow only ever shows at
 * the sides and below: the offset is at least the fade's width
 * (`STICKY_SHADOW_OFFSET_Y >= STICKY_SHADOW_SPREAD`), which keeps the top edge
 * under the paper, and that edge is not drawn at all. All of it is in the
 * shape's local units, so a small and a large sticky lift alike.
 */

/** How far below the paper the shadow's rectangle sits. */
export const STICKY_SHADOW_OFFSET_Y = 2;

/**
 * Width of the fade around that rectangle — the blur radius it stands in for.
 * Must not exceed {@link STICKY_SHADOW_OFFSET_Y}, or the fade would show above
 * the paper.
 */
export const STICKY_SHADOW_SPREAD = 2;

/** Opacity of the shadow where it is solid; every piece fades from this to 0. */
export const STICKY_SHADOW_OPACITY = 0.06;

/**
 * ids of the gradients this type contributes to the canvas-wide `<defs>`, one
 * per piece of the soft edge. Prefixed with the type name because `<defs>` ids
 * are document-global (`ObjectTypeDefinition.svgDefs`).
 */
export const STICKY_SHADOW_GRADIENT_IDS = {
	bottom: "sticky-shadow-bottom",
	left: "sticky-shadow-left",
	right: "sticky-shadow-right",
	topLeft: "sticky-shadow-top-left",
	topRight: "sticky-shadow-top-right",
	bottomLeft: "sticky-shadow-bottom-left",
	bottomRight: "sticky-shadow-bottom-right",
} as const;
