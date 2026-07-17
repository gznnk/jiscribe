import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { STORED_DATA_CAP_RATIO } from "../../../../schemas/objects/flowchart/storedData/StoredDataDoc";

/**
 * Insets both sides by the arc depth: the region starts where the straight
 * top/bottom edges begin (left) and stops at the concave right arc's apex.
 */
export const calcStoredDataTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ left: STORED_DATA_CAP_RATIO, right: STORED_DATA_CAP_RATIO },
	);
