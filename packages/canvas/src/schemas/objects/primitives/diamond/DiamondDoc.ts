import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { AUTO_COLOR } from "../../utils/autoColor";

/**
 * A diamond used for conditional branches in flowcharts.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * diamond polygon. This lets it reuse Frame-based transforms, text (placed across the
 * entire bounding box), and connector outline connections with the same mechanism as Rect.
 * A diamond needs no rounded corners, so it has no radius.
 */
export const DiamondFeatures = {
	type: "diamond",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: true,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DiamondDocBrand: unique symbol;

export type DiamondDoc = CreateObjectType<
	typeof DiamondFeatures,
	typeof DiamondDocBrand
>;

export const DIAMOND_DOC_DEFAULTS: Omit<DiamondDoc, "id"> = {
	type: "diamond",
	x: 0,
	y: 0,
	width: 120,
	height: 80,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
} as const as DiamondDoc;
