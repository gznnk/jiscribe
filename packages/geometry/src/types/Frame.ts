import type { Prettify } from "@workspace/utility-types";

/**
 * Defines the geometric properties of a frame.
 * Includes position, dimensions, rotation, and scaling factors.
 * Uses center coordinates (cx, cy) for position.
 */
export type Frame = Prettify<{
	cx: number;
	cy: number;
	width: number;
	height: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
}>;
