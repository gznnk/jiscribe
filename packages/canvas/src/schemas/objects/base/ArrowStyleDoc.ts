import type { ArrowType } from "../types/ArrowType";
import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * Properties related to arrowheads, the group `features.arrow` stands for.
 *
 * Unlike the other style groups this one is not mixed in by `CreateObjectType`: the two
 * types that carry it (polyline, connector) declare it among their own properties. It is
 * spelled out here all the same, so the field names have one source the way every other
 * group does.
 */
export type ArrowStyleDoc = {
	/** Arrowhead drawn at the start of the line. Omitted means none. */
	startArrow?: ArrowType;
	/** Arrowhead drawn at the end of the line. Omitted means none. */
	endArrow?: ArrowType;
};

/**
 * Field names owned by ArrowStyleDoc/State (identical for Doc and State).
 * Referenced by the mappers' allow-list and by the types' `extraKeys`, so a field added
 * to the group reaches both without either being edited.
 */
export const ARROW_STYLE_KEYS = exhaustiveKeysOf<ArrowStyleDoc>()([
	"startArrow",
	"endArrow",
] as const);
