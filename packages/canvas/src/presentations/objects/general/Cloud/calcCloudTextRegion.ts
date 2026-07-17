import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import type { TextRegionCalculator } from "../../registry/TextRegionRegistry";

/** Ratio insets that keep text clear of the bumps eating into the bounding box. */
const CLOUD_TEXT_INSETS = { top: 0.2, right: 0.15, bottom: 0.2, left: 0.15 };

export const calcCloudTextRegion: TextRegionCalculator<Dimensions> = ({
	width,
	height,
}) => calcInsetRect({ cx: 0, cy: 0, width, height }, CLOUD_TEXT_INSETS);
