import type { Prettify } from "@workspace/utility-types";

import type { Ellipse } from "./Ellipse";
import type { Transform } from "./Transform";

/**
 * Geometry definition for elliptical shapes with transformation.
 * Combines an ellipse with rotation and scaling properties.
 */
export type TransformedEllipse = Prettify<Ellipse & Transform>;
