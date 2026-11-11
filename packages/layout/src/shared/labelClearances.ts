/** Room kept between a label's box and the nearest corner of its own route, in px. */
export const LABEL_CORNER_CLEARANCE = 8;

/** Room kept between a label set beside its line and the line itself, in px. */
export const LABEL_BESIDE_CLEARANCE = 6;

/** Where a label sits relative to its route, in the terms a connector label stores. */
export type LabelPlacement = {
	/** 0 at the route's start, 1 at its end. */
	position: number;
	/** Signed distance from the line, in px; 0 puts the label on it. */
	offset: number;
};
