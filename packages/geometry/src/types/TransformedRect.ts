import type { Prettify } from "@workspace/utility-types";

import type { Rect } from "./Rect";
import type { Transform } from "./Transform";

/**
 * Geometry definition for rectangular shapes with transformation.
 * Combines a rectangle with rotation and scaling properties.
 */
export type TransformedRect = Prettify<Rect & Transform>;
