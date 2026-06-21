import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { AUTO_COLOR } from "../../utils/autoColor";
import type { CreateObjectType } from "../../utils/CreateObjectType";

export const EllipseFeatures = {
	type: "ellipse",
	geometry: "ellipse",
	transform: true,
	stroke: true,
	fill: true,
	text: true,
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
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
} as const as EllipseDoc;
