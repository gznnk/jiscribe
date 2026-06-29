import { DiamondFeatures } from "./DiamondDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** DiamondDoc を検証する（Frame 系共通ロジックを features から生成）。 */
export const validateDiamondDoc: ObjectDocValidateFn =
	createFrameDocValidator(DiamondFeatures);
