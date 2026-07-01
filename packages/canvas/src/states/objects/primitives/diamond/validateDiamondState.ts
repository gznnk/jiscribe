import { DiamondFeatures } from "../../../../schemas/objects/primitives/diamond/DiamondDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** DiamondState を検証する（Frame 系共通ロジックを features から生成）。 */
export const isValidDiamondState: ObjectStateValidateFn =
	createFrameStateValidator(DiamondFeatures);
