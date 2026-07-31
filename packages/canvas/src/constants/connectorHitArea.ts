/**
 * Width of the transparent band that takes the clicks for a connector (world
 * units, so it does not follow the zoom). The visible stroke takes no pointer
 * events whatever its width, so every click on a connector comes from a band of
 * this width centred on the path — the whole-path one, or one of the per-segment
 * bands drawn over it (ConnectorSegmentHitAreas 参照), which share this width.
 * Gestures derived from such a click can rely on the distance to the path being
 * at most half of this.
 */
export const CONNECTOR_HIT_STROKE_WIDTH = 12;
