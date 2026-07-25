import { isRect } from "./isRect";
import { isTransform } from "./isTransform";
import type { TransformedRect } from "../types/TransformedRect";

/** Type guard for {@link TransformedRect}. */
export const isTransformedRect = (obj: unknown): obj is TransformedRect => {
	return isRect(obj) && isTransform(obj);
};
