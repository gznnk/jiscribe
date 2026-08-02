import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { calcFileFoldSize } from "./calcFileFoldSize";

/** Gap between the silhouette and the text, as a ratio of the box. */
const FILE_TEXT_PADDING_RATIO = 0.06;

/**
 * Places the text below the folded corner, so a first line cannot run under the
 * fold. The fold is not a fixed fraction of the height (calcFileFoldSize), so the
 * top inset is derived rather than declared.
 */
export const calcFileTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			top: calcFileFoldSize(width, height) / height + FILE_TEXT_PADDING_RATIO,
			right: FILE_TEXT_PADDING_RATIO,
			bottom: FILE_TEXT_PADDING_RATIO,
			left: FILE_TEXT_PADDING_RATIO,
		},
	);
