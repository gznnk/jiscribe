import type { ObjectFeatures } from "../../types/ObjectFeatures";
import type { CreateObjectType } from "../../utils/CreateObjectType";

export const RectFeatures = {
	type: "rect",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: true,
	radius: true,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const RectDocBrand: unique symbol;

export type RectDoc = CreateObjectType<
	typeof RectFeatures,
	typeof RectDocBrand
>;

export const RECT_DOC_DEFAULTS: Omit<RectDoc, "id"> = {
	type: "rect",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	fill: "transparent",
	stroke: "#374151",
	strokeWidth: 2,
	rx: 0,
	text: "",
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000000",
	fontSize: 16,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
} as const as RectDoc;
