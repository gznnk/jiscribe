import type { Prettify } from "@workspace/utility-types";

import type { Frame } from "./Frame";
import type { Transform } from "./Transform";

/** A {@link Frame} combined with rotation and flips. */
export type TransformedFrame = Prettify<Frame & Transform>;
