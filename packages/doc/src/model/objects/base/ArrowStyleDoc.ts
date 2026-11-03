import type { ArrowType } from "../types/ArrowType";
import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * Mark an end is drawn with when its field is omitted and the type declares no
 * default of its own — the member of {@link ArrowType} that draws nothing, so an
 * end nobody set reads as a value rather than as no answer.
 */
export const DEFAULT_ARROW: ArrowType = "None";

/**
 * Factor an arrowhead is drawn with when `arrowScale` is omitted: the size that
 * follows the stroke width alone (9 × strokeWidth), so a document written before
 * the field existed draws as it did.
 */
export const DEFAULT_ARROW_SCALE = 1;

/**
 * Smallest admissible `arrowScale` — the `minimum` the JSON schema states for it.
 * Below about 0.11 a head's base (9 × strokeWidth × arrowScale wide) is narrower
 * than the line, which then shows past it on both sides; this keeps a margin over
 * that. Read by both boundaries that check the field: the doc validator
 * (validateStyleFields) and the paste guard (validateStateUtils).
 */
export const ARROW_SCALE_MIN = 0.2;

/**
 * The smallest `arrowScale` at which a line-drawn head keeps its outline at the
 * line's stroke width: below it an outline that wide fills a hollow head's own
 * opening, so the outline thins with the head instead.
 */
export const ARROW_OUTLINE_THINNING_SCALE = 0.5;

/**
 * Largest admissible `arrowScale` — the `maximum` the JSON schema states for it,
 * read by the same two boundaries as {@link ARROW_SCALE_MIN}.
 */
export const ARROW_SCALE_MAX = 4;

/**
 * Properties related to arrowheads, the group `features.arrow` stands for. Mixed into a
 * type's Doc by `CreateObjectType` when the flag is set, the same as every other style
 * group (polyline and connector are the two that set it).
 */
export type ArrowStyleDoc = {
	/** Arrowhead drawn at the start of the line. Omitted means none. */
	startArrow?: ArrowType;
	/** Arrowhead drawn at the end of the line. Omitted means none. */
	endArrow?: ArrowType;
	/**
	 * Factor on both arrowheads' size, which is otherwise 9 × strokeWidth. The
	 * heads' outline stays at the stroke width down to
	 * ARROW_OUTLINE_THINNING_SCALE, below which it thins with the head. Between ARROW_SCALE_MIN and ARROW_SCALE_MAX; omitted means 1.
	 */
	arrowScale?: number;
};

/**
 * Field names owned by ArrowStyleDoc/State (identical for Doc and State).
 * Every enumeration of the group is built from this, so a field added to the type
 * reaches them all without any being edited.
 */
export const ARROW_STYLE_KEYS = exhaustiveKeysOf<ArrowStyleDoc>()([
	"startArrow",
	"endArrow",
	"arrowScale",
] as const);
