import { isCssSafeValue } from "@workspace/basic-validators";
import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import {
	createFrameDocValidator,
	validateOptionalNumber,
} from "@workspace/canvas/unstable";

import { ContainerFeatures } from "./ContainerDoc";

/**
 * Validates the container-specific header fields (both optional). `headerFill`
 * mirrors the `fill` check: an independent safe CSS color value (or `"auto"`).
 * `headerHeight` must be a positive number. Frame-family validation only covers
 * the standard style groups, so these fields need their own checks.
 */
const validateHeaderFields: ObjectDocValidateFn = (o, path) => [
	...(!("headerFill" in o) || isCssSafeValue(o.headerFill)
		? []
		: [
				{
					path: `${path}.headerFill`,
					message: "must be a safe CSS color value",
					beyondSchema: true,
				},
			]),
	...validateOptionalNumber(o, path, "headerHeight", 1),
];

/** Validates a ContainerDoc (Frame-family shared logic + header fields). */
export const validateContainerDoc: ObjectDocValidateFn =
	createFrameDocValidator(ContainerFeatures, validateHeaderFields);
