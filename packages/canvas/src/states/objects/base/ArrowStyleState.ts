import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";

/**
 * Properties related to arrowheads (runtime state). Identical to the doc side, which is
 * why the mappers pass the group through unchanged.
 */
export type ArrowStyleState = {
	/** Arrowhead drawn at the start of the line. Omitted means none. */
	startArrow?: ArrowType;
	/** Arrowhead drawn at the end of the line. Omitted means none. */
	endArrow?: ArrowType;
	/** Factor on both arrowheads' size, which is otherwise 9 × strokeWidth. Omitted means 1. */
	arrowScale?: number;
};
