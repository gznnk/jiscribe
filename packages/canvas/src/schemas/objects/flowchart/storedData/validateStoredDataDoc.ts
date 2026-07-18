import { StoredDataFeatures } from "./StoredDataDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a StoredDataDoc (Frame-family shared logic generated from features). */
export const validateStoredDataDoc: ObjectDocValidateFn =
	createFrameDocValidator(StoredDataFeatures);
