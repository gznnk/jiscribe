import type { Prettify } from "@workspace/utility-types";

import type { Ellipse } from "./Ellipse";
import type { Transform } from "./Transform";

/** An {@link Ellipse} combined with rotation and flips. */
export type TransformedEllipse = Prettify<Ellipse & Transform>;
