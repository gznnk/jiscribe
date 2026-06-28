import { isObject } from "@workspace/basic-validators";

import {
	hasValidIdAndType,
	isValidFillStyleState,
	isValidFrameState,
	isValidRadiusStyleState,
	isValidStrokeStyleState,
	isValidTextStyleState,
	isValidTransformState,
	type StateRecord,
} from "./validateStateUtils";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";
import type { ObjectStateValidateFn } from "../../registry/ObjectStateValidatorRegistry";

/**
 * Frame 系オブジェクト（geometry: "rect" | "ellipse"）の state バリデータを
 * features から生成する。id/type・Frame・transform・stroke/fill/text/radius を
 * features に応じて検証し、図形固有の追加検証（svg の svgText など）は `extra` で渡す。
 *
 * boolean を返す型ガード方式なので、各検証は && で短絡する。
 */
export const createFrameStateValidator = (
	features: ObjectFeatures,
	extra?: (o: StateRecord) => boolean,
): ObjectStateValidateFn => {
	return (value) => {
		if (!isObject(value)) {
			return false;
		}
		const o = value as StateRecord;
		return (
			hasValidIdAndType(o, features.type) &&
			isValidFrameState(o) &&
			(!features.transform || isValidTransformState(o)) &&
			(!features.stroke || isValidStrokeStyleState(o)) &&
			(!features.fill || isValidFillStyleState(o)) &&
			(!features.text || isValidTextStyleState(o)) &&
			(!features.radius || isValidRadiusStyleState(o)) &&
			(extra === undefined || extra(o))
		);
	};
};
