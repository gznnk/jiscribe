import { isCssSafeValue } from "@jiscribe/basic-validators";
import type { ObjectDocValidateFn } from "@jiscribe/canvas-sdk/doc";
import { validateOptionalNumber } from "@jiscribe/canvas-sdk/doc";

/**
 * Validates the container-specific header fields (both optional). `headerFill`
 * mirrors the `fill` check: an independent safe CSS color value (or `"auto"`).
 * `headerHeight` must be a positive number. Frame-family validation only covers
 * the standard style groups, so these fields need their own checks.
 */
export const validateContainerHeaderFields: ObjectDocValidateFn = (o, path) => [
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
