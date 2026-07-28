import { DEFAULT_FONT_FAMILY } from "../../../../constants/defaultFontFamily";
import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";

export const StickyFeatures = {
	type: "sticky",
	geometry: "rect",
	transform: true,
	stroke: false,
	fill: true,
	text: "body",
	radius: false,
	connectable: true,
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
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000000",
	fontSize: 14,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as StickyDoc;
