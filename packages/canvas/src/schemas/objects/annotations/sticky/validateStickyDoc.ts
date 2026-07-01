import { StickyFeatures } from "./StickyDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** StickyDoc を検証する（Frame 系共通ロジックを features から生成）。 */
export const validateStickyDoc: ObjectDocValidateFn =
	createFrameDocValidator(StickyFeatures);
