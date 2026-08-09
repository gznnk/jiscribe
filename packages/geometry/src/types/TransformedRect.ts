import type { Prettify } from "@jiscribe/utility-types";

import type { Rect } from "./Rect";
import type { Transform } from "./Transform";

/** A {@link Rect} combined with rotation and flips. */
export type TransformedRect = Prettify<Rect & Transform>;
