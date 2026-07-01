import {
	validateFillStyleFields,
	validateRadiusStyleFields,
	validateRequiredNumber,
	validateStrokeStyleFields,
	validateTextStyleFields,
	validateTransformFields,
} from "./validateDocUtils";
import type { SemanticDiagnostic } from "../../canvas/validators/types";
import type { ObjectDocValidateFn } from "../../registry/ObjectDocValidatorRegistry";
import type { ObjectFeatures } from "../types/ObjectFeatures";

/** geometry の必須座標フィールドを features.geometry に応じて検証する。 */
const validateGeometryFields = (
	o: Record<string, unknown>,
	path: string,
	features: ObjectFeatures,
): SemanticDiagnostic[] =>
	features.geometry === "ellipse"
		? [
				...validateRequiredNumber(o, path, "cx"),
				...validateRequiredNumber(o, path, "cy"),
				...validateRequiredNumber(o, path, "rx", 0),
				...validateRequiredNumber(o, path, "ry", 0),
			]
		: [
				...validateRequiredNumber(o, path, "x"),
				...validateRequiredNumber(o, path, "y"),
				...validateRequiredNumber(o, path, "width", 0),
				...validateRequiredNumber(o, path, "height", 0),
			];

/**
 * Frame 系オブジェクト（geometry: "rect" | "ellipse"）の doc バリデータを
 * features から生成する。geometry / transform / stroke / fill / text / radius を
 * features に応じて合成し、図形固有の追加検証（svg の svgText など）は `extra` で渡す。
 *
 * 検証すべきフィールドの知識は validateDocUtils のビルダー側に集約され、
 * ここは「どのビルダーを features に従って呼ぶか」だけを担う。
 */
export const createFrameDocValidator =
	(
		features: ObjectFeatures,
		extra?: ObjectDocValidateFn,
	): ObjectDocValidateFn =>
	(o, path) => [
		...validateGeometryFields(o, path, features),
		...(features.transform ? validateTransformFields(o, path) : []),
		...(features.stroke ? validateStrokeStyleFields(o, path) : []),
		...(features.fill ? validateFillStyleFields(o, path) : []),
		...(features.text ? validateTextStyleFields(o, path) : []),
		...(features.radius ? validateRadiusStyleFields(o, path) : []),
		...(extra ? extra(o, path) : []),
	];
