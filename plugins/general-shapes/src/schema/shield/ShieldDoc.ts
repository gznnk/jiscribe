import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * A shield, used for security boundaries and trust zones.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is laid out inside the drawing, clear of its details.
 */
export const ShieldFeatures = {
	type: "shield",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * Shield geometry, shared by the silhouette (calcShieldCurve), the outline and
 * the text region. The flanks run straight down to the shoulder and then curve
 * to the tip at the bottom center; the control points are fractions of the box.
 */
export const SHIELD_SHOULDER_RATIO = 0.45;
export const SHIELD_FLANK_CONTROL_Y_RATIO = 0.78;
export const SHIELD_TIP_CONTROL_X_RATIO = 0.28;
export const SHIELD_TIP_CONTROL_Y_RATIO = 0.95;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ShieldDocBrand: unique symbol;

export type ShieldDoc = CreateObjectType<
	typeof ShieldFeatures,
	typeof ShieldDocBrand
>;

export const SHIELD_DOC_DEFAULTS: Omit<ShieldDoc, "id"> = {
	type: "shield",
	x: 0,
	y: 0,
	width: 100,
	height: 120,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 14,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as ShieldDoc;
