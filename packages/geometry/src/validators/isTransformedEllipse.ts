import { isEllipse } from "./isEllipse";
import { isTransform } from "./isTransform";
import type { TransformedEllipse } from "../types/TransformedEllipse";

/**
 * Type guard for {@link TransformedEllipse}.
 *
 * @param value - Value to narrow; the ellipse fields and the transform fields
 *   must all be present, so a bare {@link Ellipse} does not pass
 */
export const isTransformedEllipse = (
	value: unknown,
): value is TransformedEllipse => {
	return isEllipse(value) && isTransform(value);
};
