import type { ArrowType } from "../../../schemas/objects/types/ArrowType";

/**
 * Properties related to arrowheads (runtime state). Identical to the doc side, which is
 * why the mappers pass the group through unchanged.
 */
export type ArrowStyleState = {
	/** Arrowhead drawn at the start of the line. Omitted means none. */
	startArrow?: ArrowType;
	/** Arrowhead drawn at the end of the line. Omitted means none. */
	endArrow?: ArrowType;
};
