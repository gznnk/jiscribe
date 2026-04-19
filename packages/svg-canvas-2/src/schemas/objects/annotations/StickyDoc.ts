import type { ObjectFeatures } from "../types/ObjectFeatures";
import type { CreateObjectType } from "../utils/CreateObjectType";

export const StickyFeatures = {
	type: "sticky",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: true,
	radius: false,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const StickyDocBrand: unique symbol;

export type StickyDoc = CreateObjectType<
	typeof StickyFeatures,
	typeof StickyDocBrand
>;

export const STICKY_DOC_DEFAULTS: Omit<StickyDoc, "id"> = {
	type: "sticky",
	x: 0,
	y: 0,
	width: 160,
	height: 120,
	fill: "#fef9c3",
	stroke: "#fef9c3",
	strokeWidth: 1,
	text: "",
	textType: "textarea",
	textAlign: "center",
	verticalAlign: "center",
	fontColor: "#000000",
	fontSize: 14,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
} as const as StickyDoc;
