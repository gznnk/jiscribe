import { RectFeatures } from "../../../../schemas/objects/primitives/rect/RectDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** RectState を検証する（Frame 系共通ロジックを features から生成）。 */
export const isValidRectState: ObjectStateValidateFn =
	createFrameStateValidator(RectFeatures);
