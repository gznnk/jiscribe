/**
 * Which way ranks are stacked: `TB` puts a source above its targets, `LR` to
 * their left; `BT` / `RL` are the same stacks read the other way.
 */
export type LayoutDirection = "TB" | "BT" | "LR" | "RL";

export const LayoutDirections = [
	"TB",
	"BT",
	"LR",
	"RL",
] as const satisfies readonly LayoutDirection[];

/** True when ranks are stacked along y, so x is the axis nodes of one rank spread on. */
export const isVerticalFlow = (direction: LayoutDirection): boolean =>
	direction === "TB" || direction === "BT";
