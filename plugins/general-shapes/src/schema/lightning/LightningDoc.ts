import { AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";
import {
	DEFAULT_FILL,
	DEFAULT_STROKE_WIDTH,
	LABEL_TEXT_STYLE_DEFAULTS,
} from "@jiscribe/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * A lightning bolt, used for events, triggers and webhooks.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is drawn as a label below the box, auto-sized to the text itself, so it stays readable at any box size.
 */
export const LightningFeatures = {
	type: "lightning",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "label",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * Bolt geometry, as fractions of the box, shared by the silhouette and the
 * outline (calcLightningPoints). The bolt is point-symmetric about the box
 * center, so each ratio places a corner and its mirror image: the upper tip on
 * the top edge (the lower tip mirrored onto the bottom edge), the top of the
 * step across the middle, and the inner corner where each arm meets the step.
 *
 * The inner corners sit far enough from the center that the lines of both arms
 * pass on its far side, which keeps the center inside the bolt and the bolt
 * star-shaped about it.
 */
export const LIGHTNING_TIP_X_RATIO = 0.7;
export const LIGHTNING_STEP_TOP_RATIO = 0.4;
export const LIGHTNING_INNER_X_RATIO = 0.42;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const LightningDocBrand: unique symbol;

export type LightningDoc = CreateObjectType<
	typeof LightningFeatures,
	typeof LightningDocBrand
>;

export const LIGHTNING_DOC_DEFAULTS: Omit<LightningDoc, "id"> = {
	type: "lightning",
	x: 0,
	y: 0,
	width: 70,
	height: 100,
	fill: DEFAULT_FILL,
	stroke: AUTO_COLOR,
	strokeWidth: DEFAULT_STROKE_WIDTH,
	text: "",
	...LABEL_TEXT_STYLE_DEFAULTS,
} as const as LightningDoc;
