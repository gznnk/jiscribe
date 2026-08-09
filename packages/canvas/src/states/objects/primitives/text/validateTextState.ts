import { TextFeatures } from "../../../../schemas/objects/primitives/text/TextDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/**
 * Validates TextState. The state of a point-geometry shape is a Frame like any
 * other, so the Frame-family validator applies unchanged — the size being
 * derived rather than stored is a doc-side distinction.
 */
export const isValidTextState: ObjectStateValidator =
	createFrameStateValidator(TextFeatures);
