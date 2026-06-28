import { RectFeatures } from "./RectDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** RectDoc を検証する（Frame 系共通ロジックを features から生成）。 */
export const validateRectDoc: ObjectDocValidateFn =
	createFrameDocValidator(RectFeatures);
