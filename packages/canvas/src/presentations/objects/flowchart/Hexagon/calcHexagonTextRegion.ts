import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { HEXAGON_CAP_RATIO } from "../../../../schemas/objects/flowchart/hexagon/HexagonDoc";

/** Insets by a full cap on both sides so the region aligns with the top/bottom edges between the pointed caps. */
export const calcHexagonTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ left: HEXAGON_CAP_RATIO, right: HEXAGON_CAP_RATIO },
	);
