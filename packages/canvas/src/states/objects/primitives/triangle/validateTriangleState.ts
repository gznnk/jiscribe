import { TriangleFeatures } from "../../../../schemas/objects/primitives/triangle/TriangleDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates TriangleState (Frame-family common logic generated from features). */
export const isValidTriangleState: ObjectStateValidateFn =
	createFrameStateValidator(TriangleFeatures);
