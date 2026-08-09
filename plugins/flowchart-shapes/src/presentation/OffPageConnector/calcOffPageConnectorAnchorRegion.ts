import type { ObjectAnchorRegionCalculator } from "@jiscribe/canvas";
import type { Dimensions } from "@jiscribe/geometry";
import { calcInsetRect } from "@jiscribe/geometry";

import { OFF_PAGE_CONNECTOR_TIP_RATIO } from "../../schema/offPageConnector/OffPageConnectorDoc";

/** Excludes the bottom tip so the left/right anchors sit mid-body, not mid-bbox. */
export const calcOffPageConnectorAnchorRegion: ObjectAnchorRegionCalculator<
	Dimensions
> = ({ width, height }) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ bottom: OFF_PAGE_CONNECTOR_TIP_RATIO },
	);
