import { isString } from "@workspace/basic-validators";

import { SvgFeatures } from "../../../../schemas/objects/primitives/svg/SvgDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** SvgState を検証する（Frame 系共通 + svgText を features から生成）。 */
export const isValidSvgState: ObjectStateValidateFn = createFrameStateValidator(
	SvgFeatures,
	(o) => isString(o.svgText),
);
