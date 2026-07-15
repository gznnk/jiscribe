import { isCssSafeValue } from "@workspace/basic-validators";

import { ContainerFeatures } from "./ContainerDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/**
 * Validates the container-specific `headerFill` (optional). Mirrors the `fill`
 * check: an independent safe CSS color value (or `"auto"`). Frame-family
 * validation only covers the standard style groups, so this field needs its own
 * check to reach parity with stroke/fill.
 */
const validateHeaderFill: ObjectDocValidateFn = (o, path) =>
	!("headerFill" in o) || isCssSafeValue(o.headerFill)
		? []
		: [
				{
					path: `${path}.headerFill`,
					message: "must be a safe CSS color value",
					beyondSchema: true,
				},
			];

/** Validates a ContainerDoc (Frame-family shared logic + headerFill). */
export const validateContainerDoc: ObjectDocValidateFn =
	createFrameDocValidator(ContainerFeatures, validateHeaderFill);
