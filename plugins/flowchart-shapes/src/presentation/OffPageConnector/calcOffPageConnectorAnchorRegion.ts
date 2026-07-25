import type { ObjectAnchorRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { OFF_PAGE_CONNECTOR_TIP_RATIO } from "../../schema/offPageConnector/OffPageConnectorDoc";

/** Excludes the bottom tip so the left/right anchors sit mid-body, not mid-bbox. */
export const calcOffPageConnectorAnchorRegion: ObjectAnchorRegionCalculator<
	Dimensions
> = ({ width, height }) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ bottom: OFF_PAGE_CONNECTOR_TIP_RATIO },
	);
