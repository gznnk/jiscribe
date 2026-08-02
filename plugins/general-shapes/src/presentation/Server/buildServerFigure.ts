import { SERVER_CORNER_RATIO } from "../../schema/server/ServerDoc";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import {
	buildEllipsePath,
	buildHorizontalLinePath,
	buildRoundedRectPath,
} from "../shared/pictogramPaths";

/** Rack units stacked in the box; the dividers between them are what reads as a rack. */
const SERVER_UNIT_COUNT = 3;

/** Status light: radius as a fraction of the shorter side, x as a fraction of the width. */
const SERVER_LIGHT_RADIUS_RATIO = 0.045;
const SERVER_LIGHT_X_RATIO = 0.16;

/** The vent slot spanning the rest of each unit, as fractions of the width. */
const SERVER_SLOT_LEFT_RATIO = 0.34;
const SERVER_SLOT_RIGHT_RATIO = 0.84;

/**
 * Lays out a server rack over the bounding box whose top-left corner is at
 * (x, y): one rounded silhouette, divided into equal units that each carry a
 * status light and a vent slot. Shared by the object renderer (centered origin),
 * the draw-drag preview that reuses it, and the stencil icon.
 */
export const buildServerFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => {
	const unitHeight = height / SERVER_UNIT_COUNT;
	const lightRadius = Math.min(width, height) * SERVER_LIGHT_RADIUS_RATIO;
	const detail: string[] = [];

	for (let unit = 0; unit < SERVER_UNIT_COUNT; unit++) {
		const centerY = y + unitHeight * (unit + 0.5);
		// The topmost unit needs no divider — the silhouette's own edge is it.
		if (unit > 0) {
			detail.push(buildHorizontalLinePath(y + unitHeight * unit, x, x + width));
		}
		detail.push(
			buildEllipsePath(
				x + width * SERVER_LIGHT_X_RATIO,
				centerY,
				lightRadius,
				lightRadius,
			),
		);
		detail.push(
			buildHorizontalLinePath(
				centerY,
				x + width * SERVER_SLOT_LEFT_RATIO,
				x + width * SERVER_SLOT_RIGHT_RATIO,
			),
		);
	}

	return {
		body: [
			buildRoundedRectPath(
				x,
				y,
				width,
				height,
				Math.min(width, height) * SERVER_CORNER_RATIO,
			),
		],
		detail,
	};
};
