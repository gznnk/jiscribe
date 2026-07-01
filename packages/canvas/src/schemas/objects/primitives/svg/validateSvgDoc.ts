import { isString } from "@workspace/basic-validators";

import { SvgFeatures } from "./SvgDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Svg 固有フィールド svgText（必須の文字列）を検証する。 */
const validateSvgText: ObjectDocValidateFn = (o, path) =>
	isString(o.svgText)
		? []
		: [{ path: `${path}.svgText`, message: "must be a string" }];

/** SvgDoc を検証する（Frame 系共通 + svgText を features から生成）。 */
export const validateSvgDoc: ObjectDocValidateFn = createFrameDocValidator(
	SvgFeatures,
	validateSvgText,
);
