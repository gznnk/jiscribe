import { isFrame } from "./isFrame";
import { isTransform } from "./isTransform";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Type guard for {@link TransformedFrame}.
 *
 * @param value - Value to narrow; the frame fields and the transform fields
 *   must all be present, so a bare {@link Frame} does not pass
 */
export const isTransformedFrame = (
	value: unknown,
): value is TransformedFrame => {
	return isFrame(value) && isTransform(value);
};
