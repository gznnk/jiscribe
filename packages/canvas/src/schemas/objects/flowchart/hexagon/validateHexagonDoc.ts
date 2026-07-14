import { HexagonFeatures } from "./HexagonDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a HexagonDoc (Frame-family shared logic generated from features). */
export const validateHexagonDoc: ObjectDocValidateFn =
	createFrameDocValidator(HexagonFeatures);
