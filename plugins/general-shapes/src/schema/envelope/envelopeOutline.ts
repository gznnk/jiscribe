import { calcRoundedRectOutline } from "@jiscribe/canvas-sdk/doc";
import type { ObjectDocOutlineCalculator } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";

import { ENVELOPE_CORNER_RATIO } from "./EnvelopeDoc";

/**
 * Envelope outline (centered): the body's rounded box. The flap is a detail
 * line across it and does not change the silhouette.
 */
export const envelopeOutline: ObjectDocOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcRoundedRectOutline(
		width,
		height,
		Math.min(width, height) * ENVELOPE_CORNER_RATIO,
	);
