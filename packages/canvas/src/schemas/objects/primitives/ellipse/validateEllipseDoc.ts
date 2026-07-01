import { EllipseFeatures } from "./EllipseDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** EllipseDoc を検証する（Frame 系共通ロジックを features から生成）。 */
export const validateEllipseDoc: ObjectDocValidateFn =
	createFrameDocValidator(EllipseFeatures);
