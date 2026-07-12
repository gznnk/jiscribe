import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

/** Insets the right so text clears the semicircular right cap. */
export const calcDelayTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect({ cx: 0, cy: 0, width, height }, { right: 0.2 });
