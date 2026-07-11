import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { HEXAGON_CAP_RATIO } from "../../../../schemas/objects/primitives/hexagon/HexagonDoc";

/** Insets the region by half a cap on both sides to keep centered text inside the pointed silhouette. */
export const calcHexagonTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ left: HEXAGON_CAP_RATIO / 2, right: HEXAGON_CAP_RATIO / 2 },
	);
