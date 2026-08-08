import { isRect } from "./isRect";
import { isTransform } from "./isTransform";
import type { TransformedRect } from "../types/TransformedRect";

/**
 * Type guard for {@link TransformedRect}.
 *
 * @param value - Value to narrow; the rect fields and the transform fields must
 *   all be present, so a bare {@link Rect} does not pass
 */
export const isTransformedRect = (value: unknown): value is TransformedRect => {
	return isRect(value) && isTransform(value);
};
