import type { Prettify } from "@workspace/utility-types";

import type { BoundingBox } from "./BoundingBox";
import type { Point } from "./Point";

/**
 * Defines a rectangular box with edge coordinates and feature points.
 * Used for determining boundaries and calculating intersection points with other elements.
 */
export type BoxFeatures = Prettify<
	BoundingBox & {
		center: Point;
		topLeft: Point;
		bottomLeft: Point;
		topRight: Point;
		bottomRight: Point;
	}
>;
