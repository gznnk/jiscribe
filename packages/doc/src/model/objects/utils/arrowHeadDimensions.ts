// The dimensions every arrowhead is laid out by, in the head's local units: the
// tip at (0,0) and the head trailing toward -x, drawn at `strokeWidth ×
// arrowScale` world units per local unit. The canvas draws the heads from these
// and stops its lines by them; the doc layer measures by them, so the two cannot
// disagree about how long a head is.

/** Arrow size constant: the length of a triangle head along the line, its base's full width. */
export const ARROW_SIZE = 9;

/**
 * How far an arrowhead's drawing runs from its tip (local units), its outline
 * left out: the axis the shapes are laid out on has the tip at (0,0) and the
 * head trailing toward -x.
 */
export type ArrowExtent = {
	/** Distance from the tip to the rearmost point of the head. */
	length: number;
	/** Half the head's spread across the line. */
	halfWidth: number;
};

// --- The ER crow's foot cardinality marks -----------------------------------
//
// All five marks are laid out on the same axis as the other arrows. Each draws
// its own spine (the segment from its rearmost element up to the tip) rather
// than relying on the connector line, so the line can be inset past the whole
// mark. That keeps the hollow "zero" circle readable without depending on the
// background color, the same reason the other hollow arrows are inset.

/** Run of the crow's foot prongs along the line. */
export const CROW_FOOT_LENGTH = ARROW_SIZE;

/** Half height of the prong spread at the tip, and of the cardinality bars. */
export const CROW_FOOT_HALF_HEIGHT = ARROW_SIZE / 2;

/** Clearance between two adjacent elements of a mark (edge to edge). */
export const CROW_FOOT_MARK_GAP = ARROW_SIZE * 0.45;

/** Radius of the hollow circle denoting the "zero" (optional) lower bound. */
export const CROW_FOOT_CIRCLE_RADIUS = ARROW_SIZE * 0.3;

/** Distance from the tip to the leading bar of the marks that have no prongs. */
export const CROW_FOOT_BAR_OFFSET = ARROW_SIZE * 0.45;

/** CrowFootOne: distance from the tip to the bar standing behind the leading one. */
export const CROW_FOOT_ONE_REAR_BAR_DISTANCE =
	CROW_FOOT_BAR_OFFSET + CROW_FOOT_MARK_GAP;

/** CrowFootOneMany: distance from the tip to the bar standing behind the prongs. */
export const CROW_FOOT_ONE_MANY_BAR_DISTANCE =
	CROW_FOOT_LENGTH + CROW_FOOT_MARK_GAP;

/** CrowFootZeroMany: distance from the tip to the near edge of the circle, where the spine ends. */
export const CROW_FOOT_ZERO_MANY_CIRCLE_NEAR_EDGE =
	CROW_FOOT_LENGTH + CROW_FOOT_MARK_GAP;

/** CrowFootZeroOne: distance from the tip to the near edge of the circle, where the spine ends. */
export const CROW_FOOT_ZERO_ONE_CIRCLE_NEAR_EDGE =
	CROW_FOOT_BAR_OFFSET + CROW_FOOT_MARK_GAP;

// --- Cross -----------------------------------------------------------------

/** Half length of each arm, so the cross spans `ARROW_SIZE * 0.8` along the line. */
export const CROSS_ARM = ARROW_SIZE * 0.4;

// --- Line insets -----------------------------------------------------------
//
// Where the line stops short of each head's tip (local units), so it does not
// show through a hollow head or past a narrow tip (the canvas's
// getArrowLineInset). OpenArrow is stopped short only once its outline thins
// (OPEN_ARROW_THIN_OUTLINE_LINE_INSET).

/**
 * FilledTriangle: since the base sits at `-ARROW_SIZE`, stop the line at the base.
 */
export const FILLED_TRIANGLE_INSET = ARROW_SIZE;

/**
 * ConcaveTriangle: since the concave notch (valley) at the tail sits at
 * `-ARROW_SIZE * 0.9`, stop the line there.
 */
export const CONCAVE_TRIANGLE_INSET = ARROW_SIZE * 0.9;

/**
 * HollowTriangle: the base sits at `-ARROW_SIZE`, so the line stops at the base
 * (also preventing it from passing through the hollow interior).
 */
export const HOLLOW_TRIANGLE_INSET = ARROW_SIZE;

/**
 * FilledDiamond: the widest point is the center (`-ARROW_SIZE/2`). Pulling the
 * line back to the trailing vertex would make it look too short, so the line is
 * inset to the center where it is hidden by the fill.
 */
export const FILLED_DIAMOND_INSET = ARROW_SIZE / 2;

/**
 * HollowDiamond: since the shape is hollow, the line stops at the trailing
 * vertex (`-ARROW_SIZE`) so it does not pass through the interior.
 */
export const HOLLOW_DIAMOND_INSET = ARROW_SIZE;

/**
 * Circle: the widest point is the circle's center (`-ARROW_SIZE/2`); let the
 * line reach into the center where it is hidden by the fill.
 */
export const CIRCLE_INSET = ARROW_SIZE / 2;

/**
 * HollowCircle: the circle is hollow, so the line stops at its far edge (the
 * full diameter) instead of showing through the interior.
 */
export const HOLLOW_CIRCLE_INSET = ARROW_SIZE;

/**
 * Cross: the cross sits *on* the line (UML draws the non-navigable mark over the
 * association end), so the line runs through to the tip and is not shortened.
 */
export const CROSS_INSET = 0;

/**
 * CrowFootMany: the mark draws its own spine, so the line stops where the
 * prongs converge.
 */
export const CROW_FOOT_MANY_INSET = CROW_FOOT_LENGTH;

/** CrowFootOne: the mark draws its own spine, so the line stops at the rear bar. */
export const CROW_FOOT_ONE_INSET = CROW_FOOT_ONE_REAR_BAR_DISTANCE;

/** CrowFootOneMany: the mark draws its own spine, so the line stops at the rear bar. */
export const CROW_FOOT_ONE_MANY_INSET = CROW_FOOT_ONE_MANY_BAR_DISTANCE;

/**
 * CrowFootZeroMany: the line stops at the circle's far edge; the circle bridges
 * the gap to the spine, so nothing crosses the hollow interior.
 */
export const CROW_FOOT_ZERO_MANY_INSET =
	CROW_FOOT_ZERO_MANY_CIRCLE_NEAR_EDGE + CROW_FOOT_CIRCLE_RADIUS * 2;

/**
 * CrowFootZeroOne: the line stops at the circle's far edge; the circle bridges
 * the gap to the spine, so nothing crosses the hollow interior.
 */
export const CROW_FOOT_ZERO_ONE_INSET =
	CROW_FOOT_ZERO_ONE_CIRCLE_NEAR_EDGE + CROW_FOOT_CIRCLE_RADIUS * 2;

/**
 * How far short of the tip (in stroke widths) the line stops once an OpenArrow
 * head is scaled below ARROW_OUTLINE_THINNING_SCALE and its outline thins: where
 * the V's arms stand one stroke width apart, so the line's end sits between them
 * instead of showing past the thinner arms. Read by the canvas's
 * calcArrowLineEndWedge, which calcArrowLineInset stops the line by.
 */
export const OPEN_ARROW_THIN_OUTLINE_LINE_INSET =
	0.5 / Math.tan(Math.atan2(ARROW_SIZE / 2, ARROW_SIZE));

// --- Extents ---------------------------------------------------------------
//
// How far each head runs from its tip (local units). Unlike the line inset,
// which is where the line stops, this is the rear of the drawing: a circle or a
// crow's foot runs on past its inset.

/** FilledTriangle's extent. */
export const FILLED_TRIANGLE_EXTENT: ArrowExtent = {
	length: ARROW_SIZE,
	halfWidth: ARROW_SIZE / 2,
};

/** ConcaveTriangle's extent. */
export const CONCAVE_TRIANGLE_EXTENT: ArrowExtent = {
	length: ARROW_SIZE,
	halfWidth: ARROW_SIZE / 2,
};

/** OpenArrow's extent. */
export const OPEN_ARROW_EXTENT: ArrowExtent = {
	length: ARROW_SIZE,
	halfWidth: ARROW_SIZE / 2,
};

/** HollowTriangle's extent. */
export const HOLLOW_TRIANGLE_EXTENT: ArrowExtent = {
	length: ARROW_SIZE,
	halfWidth: ARROW_SIZE / 2,
};

/** FilledDiamond's extent. */
export const FILLED_DIAMOND_EXTENT: ArrowExtent = {
	length: ARROW_SIZE,
	halfWidth: ARROW_SIZE / 2,
};

/** HollowDiamond's extent. */
export const HOLLOW_DIAMOND_EXTENT: ArrowExtent = {
	length: ARROW_SIZE,
	halfWidth: ARROW_SIZE / 2,
};

/** Circle's extent: the circle's diameter along the line. */
export const CIRCLE_EXTENT: ArrowExtent = {
	length: ARROW_SIZE,
	halfWidth: ARROW_SIZE / 2,
};

/** HollowCircle's extent: the circle's diameter along the line. */
export const HOLLOW_CIRCLE_EXTENT: ArrowExtent = {
	length: ARROW_SIZE,
	halfWidth: ARROW_SIZE / 2,
};

/** Cross's extent: both arms along the line. */
export const CROSS_EXTENT: ArrowExtent = {
	length: CROSS_ARM * 2,
	halfWidth: CROSS_ARM,
};

/** CrowFootMany's extent. */
export const CROW_FOOT_MANY_EXTENT: ArrowExtent = {
	length: CROW_FOOT_LENGTH,
	halfWidth: CROW_FOOT_HALF_HEIGHT,
};

/** CrowFootOne's extent: the rear bar is the rearmost point. */
export const CROW_FOOT_ONE_EXTENT: ArrowExtent = {
	length: CROW_FOOT_ONE_REAR_BAR_DISTANCE,
	halfWidth: CROW_FOOT_HALF_HEIGHT,
};

/** CrowFootOneMany's extent: the bar behind the prongs is the rearmost point. */
export const CROW_FOOT_ONE_MANY_EXTENT: ArrowExtent = {
	length: CROW_FOOT_ONE_MANY_BAR_DISTANCE,
	halfWidth: CROW_FOOT_HALF_HEIGHT,
};

/**
 * CrowFootZeroMany's extent: the circle's far edge is the rearmost point; it is
 * narrower than the prongs.
 */
export const CROW_FOOT_ZERO_MANY_EXTENT: ArrowExtent = {
	length: CROW_FOOT_ZERO_MANY_INSET,
	halfWidth: CROW_FOOT_HALF_HEIGHT,
};

/**
 * CrowFootZeroOne's extent: the circle's far edge is the rearmost point; it is
 * narrower than the bar.
 */
export const CROW_FOOT_ZERO_ONE_EXTENT: ArrowExtent = {
	length: CROW_FOOT_ZERO_ONE_INSET,
	halfWidth: CROW_FOOT_HALF_HEIGHT,
};
