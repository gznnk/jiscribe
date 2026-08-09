import type { Prettify } from "@jiscribe/utility-types";

import type { BoundingBox } from "./BoundingBox";
import type { Point } from "./Point";

/** A {@link BoundingBox} extended with its center and four corners. */
export type BoxFeatures = Prettify<
	BoundingBox & {
		center: Point;
		topLeft: Point;
		bottomLeft: Point;
		topRight: Point;
		bottomRight: Point;
	}
>;
