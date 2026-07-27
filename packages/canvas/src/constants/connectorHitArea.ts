/**
 * Width of the transparent band that takes the clicks for a connector (world
 * units, so it does not follow the zoom). The visible stroke takes no pointer
 * events whatever its width, making this band the only region a click on a
 * connector can come from — gestures derived from such a click can rely on the
 * distance to the path being at most half of this.
 */
export const CONNECTOR_HIT_STROKE_WIDTH = 12;
