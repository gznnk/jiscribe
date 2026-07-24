import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { OFF_PAGE_CONNECTOR_TIP_RATIO } from "../../schema/offPageConnector/OffPageConnectorDoc";

/** Insets the bottom by a full tip height so text stays in the rectangular band above the point. */
export const calcOffPageConnectorTextRegion: ObjectTextRegionCalculator<
	Dimensions
> = ({ width, height }) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ bottom: OFF_PAGE_CONNECTOR_TIP_RATIO },
	);
