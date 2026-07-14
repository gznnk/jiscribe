import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { MANUAL_INPUT_SLOPE_RATIO } from "../../../../schemas/objects/flowchart/manualInput/ManualInputDoc";

/** Insets the top by the full slope so text stays below the sloping top edge. */
export const calcManualInputTextRegion = ({
	width,
	height,
}: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ top: MANUAL_INPUT_SLOPE_RATIO },
	);
