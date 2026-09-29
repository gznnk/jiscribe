/**
 * Width of the transparent strip that takes the clicks along a frame's border
 * (container, awsGroup). World units, so it does not follow the zoom. A frame
 * passes its interior through to the shapes it encloses, which leaves the
 * painted border as the only target — 1px at the default stroke width, and
 * thinner still once zoomed out. Give the strip this width with
 * `pointer-events: stroke` and let the visible border take no pointer events.
 *
 * The strip straddles the edge, so half of this is taken from the interior: a
 * shape placed hard against the border loses that much of its own edge to the
 * frame. That is what caps the width here, and it is why this is a separate
 * value from `LINE_HIT_STROKE_WIDTH` in `@jiscribe/canvas` (the band around a
 * connector or polyline, which has no interior to pay). The two happen to be
 * equal — move one without the other.
 */
export const FRAME_BORDER_HIT_STROKE_WIDTH = 12;
