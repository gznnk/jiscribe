import { isString } from "@jiscribe/basic-validators";
import { SvgFeatures } from "@jiscribe/doc/model/objects/primitives/svg/SvgDoc";

import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates SvgState (Frame-family common checks + svgText, generated from features). */
export const isValidSvgState: ObjectStateValidator = createFrameStateValidator(
	SvgFeatures,
	(o) => isString(o.svgText),
);
