import { ENVELOPE_CORNER_RATIO } from "../../schema/envelope/EnvelopeDoc";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import { buildRoundedRectPath } from "../shared/pictogramPaths";

/** How far the flap's crease dips below the top edge, as a fraction of the height. */
const ENVELOPE_FLAP_DEPTH_RATIO = 0.56;

/**
 * Lays out a closed envelope over the bounding box whose top-left corner is at
 * (x, y): the body, plus the flap folded down to a crease below its center.
 * Shared by the object renderer (centered origin) and the draw-drag preview
 * that reuses it.
 */
export const buildEnvelopeFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => ({
	body: [
		buildRoundedRectPath(
			x,
			y,
			width,
			height,
			Math.min(width, height) * ENVELOPE_CORNER_RATIO,
		),
	],
	detail: [
		`M ${x} ${y} L ${x + width / 2} ${y + height * ENVELOPE_FLAP_DEPTH_RATIO} L ${x + width} ${y}`,
	],
});
