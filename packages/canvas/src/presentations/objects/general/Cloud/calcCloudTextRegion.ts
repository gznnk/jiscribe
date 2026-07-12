import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

/** Ratio insets that keep text clear of the bumps eating into the bounding box. */
const CLOUD_TEXT_INSETS = { top: 0.2, right: 0.15, bottom: 0.2, left: 0.15 };

export const calcCloudTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect({ cx: 0, cy: 0, width, height }, CLOUD_TEXT_INSETS);
