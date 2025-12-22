import type { Prettify } from "@workspace/utility-types";

import type { Box } from "./Box";
import type { Point } from "./Point";

/**
 * Defines a rectangular box geometry with edge coordinates and corner points.
 * Used for determining boundaries and calculating intersection points with other elements.
 */
export type BoxGeometry = Prettify<
	Box & {
		center: Point;
		topLeft: Point;
		bottomLeft: Point;
		topRight: Point;
		bottomRight: Point;
	}
>;
