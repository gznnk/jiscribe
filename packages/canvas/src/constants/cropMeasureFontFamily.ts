import { DEFAULT_FONT_FAMILY } from "./fontFamilies";

/**
 * Family a measurement uses when it deliberately does not follow the host theme.
 * The same value as {@link DEFAULT_FONT_FAMILY}, derived from it so the two can
 * never drift; the separate name is the point.
 *
 * What a caller of this decides is a *crop* — the zoom-to-fit rect and the export
 * viewBox (ObjectVisualBoundsCalculator) — not the box text is drawn into. A host
 * on another family gets a margin off by the width the two faces differ by, which
 * nothing on screen reveals; a label is never clipped by it.
 *
 * Handing the drawing context down to those calculators instead was measured at
 * 29 files of plumbing through `calcObjectBoundingBox` and every viewport, export
 * and culling caller below it. That is the price this constant is refusing, and
 * the number is here so the trade does not have to be re-derived: if the reason
 * to change it is "the family should be the theme's", the answer is no — see #1
 * for the case where it does matter.
 *
 * The calculators that decide a *drawn* box do take the theme's family, through
 * `ObjectTextRegionContext` and `ObjectContentResizeContext`. Getting those wrong
 * clips text, so they are worth the plumbing and this is not.
 */
export const CROP_MEASURE_FONT_FAMILY = DEFAULT_FONT_FAMILY;
