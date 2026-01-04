import type { Point } from "@workspace/geometry";
import type { Prettify } from "@workspace/utility-types";

import type { Dimensions } from "@workspace/geometry";

/**
 * Defines the rectangular bounds of a diagram element.
 * Used to determine the position and dimensions of diagram elements on the canvas.
 */
export type Bounds = Prettify<Point & Dimensions>;
