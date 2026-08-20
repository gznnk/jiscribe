import { DEFAULT_FONT_FAMILY } from "../../../../constants/fontFamilies";
import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { AUTO_COLOR } from "../../utils/autoColor";

export const EllipseFeatures = {
	type: "ellipse",
	geometry: "ellipse",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const EllipseDocBrand: unique symbol;

export type EllipseDoc = CreateObjectType<
	typeof EllipseFeatures,
	typeof EllipseDocBrand
>;

export const ELLIPSE_DOC_DEFAULTS: Omit<EllipseDoc, "id"> = {
	type: "ellipse",
	cx: 0,
	cy: 0,
	rx: 50,
	ry: 50,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as EllipseDoc;
