/**
 * Width of the transparent band that takes the clicks for a thin line — a
 * connector (ConnectorHitArea and the per-segment bands over it) or a polyline
 * (PolylineHitArea). World units, so it does not follow the zoom. The visible
 * stroke takes no pointer events whatever its width, so every click on such a
 * line comes from a band of this width centred on the path, and a gesture
 * derived from one can rely on the distance to the path being at most half of
 * this.
 *
 * Widening this costs nothing, because a line has no interior to take it from.
 * The strip along a frame's border is the opposite case and carries its own
 * width (`FRAME_BORDER_HIT_STROKE_WIDTH` in `@jiscribe/canvas-sdk`): there the
 * inner half is taken from the shapes the frame encloses. The two are
 * deliberately separate values that happen to be equal — move one without the
 * other.
 */
export const LINE_HIT_STROKE_WIDTH = 12;
