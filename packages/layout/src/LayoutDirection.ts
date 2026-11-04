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

/**
 * Whether two coordinates are the same for routing purposes: an anchor placed by a
 * ratio of a width lands a float's tail off the column it was meant for.
 */
export const isSameCoordinate = (a: number, b: number): boolean =>
	Math.abs(a - b) < 1e-6;
