import {
	BOT_ANTENNA_BALL_RADIUS_RATIO,
	BOT_HEAD_CORNER_RATIO,
	BOT_HEAD_TOP_RATIO,
} from "../../schema/bot/BotDoc";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import {
	buildEllipsePath,
	buildRoundedRectPath,
	buildVerticalLinePath,
} from "../shared/pictogramPaths";

/** The eyes: how far down the head they sit as a fraction of its height, their offset from the center as a fraction of the width. */
const BOT_EYE_Y_RATIO = 0.42;
const BOT_EYE_X_OFFSET_RATIO = 0.2;

/** Eye radius, as a fraction of the shorter side. */
const BOT_EYE_RADIUS_RATIO = 0.07;

/**
 * Lays out a robot head over the bounding box whose top-left corner is at
 * (x, y). Only the head is a silhouette: the antenna's stick and ball and the
 * eyes are detail, so a fill paints the head alone.
 *
 * The antenna therefore paints nothing that can be hit, which would leave the
 * box above the head unable to receive a connector at all (PictogramFigure.hit).
 * It gets a hit path of its own: a post as wide as the ball, capped by the
 * ball's upper half and closed across the head's top — the same shape the
 * outline traces there (botOutline).
 *
 * Shared by the object renderer (centered origin) and the draw-drag preview
 * that reuses it.
 */
export const buildBotFigure: PictogramFigureBuilder = (x, y, width, height) => {
	const centerX = x + width / 2;
	const headTop = y + height * BOT_HEAD_TOP_RATIO;
	const headHeight = height * (1 - BOT_HEAD_TOP_RATIO);
	const shorterSide = Math.min(width, height);
	const ballRadius = shorterSide * BOT_ANTENNA_BALL_RADIUS_RATIO;
	const ballCenterY = y + ballRadius;
	const eyeY = headTop + headHeight * BOT_EYE_Y_RATIO;
	const eyeRadius = shorterSide * BOT_EYE_RADIUS_RATIO;
	const eyeOffset = width * BOT_EYE_X_OFFSET_RATIO;

	return {
		body: [
			buildRoundedRectPath(
				x,
				headTop,
				width,
				headHeight,
				shorterSide * BOT_HEAD_CORNER_RATIO,
			),
		],
		hit: [
			`M ${centerX - ballRadius} ${headTop} V ${ballCenterY} ` +
				`A ${ballRadius} ${ballRadius} 0 0 1 ${centerX + ballRadius} ${ballCenterY} ` +
				`V ${headTop} Z`,
		],
		detail: [
			buildVerticalLinePath(centerX, headTop, ballCenterY + ballRadius),
			buildEllipsePath(centerX, ballCenterY, ballRadius, ballRadius),
			buildEllipsePath(centerX - eyeOffset, eyeY, eyeRadius, eyeRadius),
			buildEllipsePath(centerX + eyeOffset, eyeY, eyeRadius, eyeRadius),
		],
	};
};
