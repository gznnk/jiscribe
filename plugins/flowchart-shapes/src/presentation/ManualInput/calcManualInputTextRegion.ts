import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { MANUAL_INPUT_SLOPE_RATIO } from "../../schema/manualInput/ManualInputDoc";

/** Insets the top by the full slope so text stays below the sloping top edge. */
export const calcManualInputTextRegion: ObjectTextRegionCalculator<
	Dimensions
> = ({ width, height }) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ top: MANUAL_INPUT_SLOPE_RATIO },
	);
