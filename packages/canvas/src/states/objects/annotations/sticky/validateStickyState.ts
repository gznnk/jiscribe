import { StickyFeatures } from "../../../../schemas/objects/annotations/sticky/StickyDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** StickyState を検証する（Frame 系共通ロジックを features から生成）。 */
export const isValidStickyState: ObjectStateValidateFn =
	createFrameStateValidator(StickyFeatures);
