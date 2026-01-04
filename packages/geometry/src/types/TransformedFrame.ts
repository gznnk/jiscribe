import type { Prettify } from "@workspace/utility-types";

import type { Frame } from "./Frame";
import type { Transform } from "./Transform";

/**
 * Geometry definition for a frame with transformation.
 * Combines a center-based rectangle with rotation and scaling properties.
 */
export type TransformedFrame = Prettify<Frame & Transform>;
