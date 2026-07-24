import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { DOCUMENT_WAVE_RATIO } from "../../schema/document/DocumentDoc";

/** Stops the region above the wavy bottom edge (the wave swings one amplitude around its centerline). */
export const calcDocumentTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ bottom: DOCUMENT_WAVE_RATIO * 2 },
	);
