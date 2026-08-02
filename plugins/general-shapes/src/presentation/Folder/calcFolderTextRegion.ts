import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { FOLDER_TAB_HEIGHT_RATIO } from "../../schema/folder/FolderDoc";

/** Gap between the silhouette and the text, as a ratio of the box. */
const FOLDER_TEXT_PADDING_RATIO = 0.06;

/**
 * Places the text in the body below the tab, so a first line cannot run into the
 * notch the tab leaves on the top-right.
 */
export const calcFolderTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			top: FOLDER_TAB_HEIGHT_RATIO + FOLDER_TEXT_PADDING_RATIO,
			right: FOLDER_TEXT_PADDING_RATIO,
			bottom: FOLDER_TEXT_PADDING_RATIO,
			left: FOLDER_TEXT_PADDING_RATIO,
		},
	);
