import type { LayoutSide } from "./types";

/** Every side of a box, in the order candidates are tried and margins checked. */
export const LAYOUT_SIDES: readonly LayoutSide[] = [
	"top",
	"right",
	"bottom",
	"left",
];

/** A side of one node, as one string: the key the rules counting ends per side use. */
export const toSideKey = (nodeId: string, side: LayoutSide): string =>
	`${nodeId}\u0000${side}`;
