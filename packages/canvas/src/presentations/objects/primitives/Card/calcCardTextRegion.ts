import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

/** Insets the top slightly so text clears the cut corner. */
export const calcCardTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect({ cx: 0, cy: 0, width, height }, { top: 0.12 });
