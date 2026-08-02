import type { ObjectOutlineCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";

import { ENVELOPE_CORNER_RATIO } from "../../schema/envelope/EnvelopeDoc";
import { calcRoundedRectOutline } from "../shared/calcRoundedRectOutline";

/**
 * Envelope outline (centered): the body's rounded box. The flap is a detail
 * line across it and does not change the silhouette.
 */
export const envelopeOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcRoundedRectOutline(
		width,
		height,
		Math.min(width, height) * ENVELOPE_CORNER_RATIO,
	);
