import type { Prettify } from "@workspace/utility-types";

import type { Bounds } from "./Bounds";

/**
 * Defines the geometric properties of a frame.
 * Includes position, dimensions, rotation, and scaling factors.
 */
export type Frame = Prettify<
	Bounds & {
		rotation: number;
		scaleX: number;
		scaleY: number;
	}
>;
