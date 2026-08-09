import type { CreateObjectType, ObjectFeatures } from "@jiscribe/canvas/doc";
import {
	AUTO_COLOR,
	BELOW_LABEL_STYLE_DEFAULTS,
} from "@jiscribe/canvas-sdk/doc";

/**
 * A gear, used for services, batch jobs and daemons.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is drawn as a label below the box, auto-sized to the text itself, so it stays readable at any box size.
 */
export const GearFeatures = {
	type: "gear",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * Rim geometry, shared by the silhouette (calcGearPoints) and the outline.
 * Teeth ride the box's inscribed ellipse; the root radius is a fraction of that,
 * and the two half-angles are fractions of one tooth's angular pitch.
 */
export const GEAR_TOOTH_COUNT = 8;
export const GEAR_ROOT_RADIUS_RATIO = 0.74;
export const GEAR_TIP_HALF_ANGLE_RATIO = 0.2;
export const GEAR_ROOT_HALF_ANGLE_RATIO = 0.3;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const GearDocBrand: unique symbol;

export type GearDoc = CreateObjectType<
	typeof GearFeatures,
	typeof GearDocBrand
>;

export const GEAR_DOC_DEFAULTS: Omit<GearDoc, "id"> = {
	type: "gear",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as GearDoc;
