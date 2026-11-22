import { AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";
import {
	DEFAULT_FILL,
	DEFAULT_STROKE_WIDTH,
	LABEL_TEXT_STYLE_DEFAULTS,
} from "@jiscribe/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * A robot head, used for AI agents, LLMs and automation bots.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is drawn as a label below the box, auto-sized to the text itself, so it stays readable at any box size.
 */
export const BotFeatures = {
	type: "bot",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "label",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * Head geometry, as fractions of the box: where its top edge sits, and its
 * corner radius (a fraction of the shorter side). The head spans the full width
 * and reaches the bottom edge. Shared by the silhouette and the outline.
 */
export const BOT_HEAD_TOP_RATIO = 0.3;
export const BOT_HEAD_CORNER_RATIO = 0.16;

/**
 * Radius of the ball on top of the antenna, as a fraction of the shorter side.
 * The ball's top sits on the box's top edge. Shared by the drawing, the hit path
 * and the outline; the last two stand a post of the ball's width on the head in
 * place of the thin stick.
 */
export const BOT_ANTENNA_BALL_RADIUS_RATIO = 0.08;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const BotDocBrand: unique symbol;

export type BotDoc = CreateObjectType<typeof BotFeatures, typeof BotDocBrand>;

export const BOT_DOC_DEFAULTS: Omit<BotDoc, "id"> = {
	type: "bot",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	fill: DEFAULT_FILL,
	stroke: AUTO_COLOR,
	strokeWidth: DEFAULT_STROKE_WIDTH,
	text: "",
	...LABEL_TEXT_STYLE_DEFAULTS,
} as const as BotDoc;
