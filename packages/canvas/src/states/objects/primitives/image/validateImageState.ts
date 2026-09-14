import { isString } from "@jiscribe/basic-validators";
import { ImageFeatures } from "@jiscribe/doc/model/objects/primitives/image/ImageDoc";

import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/**
 * Validates ImageState (Frame-family common checks + src, generated from
 * features). An empty `src` names no file, so it is rejected like a missing one.
 */
export const isValidImageState: ObjectStateValidator =
	createFrameStateValidator(
		ImageFeatures,
		(o) => isString(o.src) && o.src !== "",
	);
