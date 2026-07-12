import { TriangleFeatures } from "./TriangleDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a TriangleDoc (Frame-family shared logic generated from features). */
export const validateTriangleDoc: ObjectDocValidateFn =
	createFrameDocValidator(TriangleFeatures);
