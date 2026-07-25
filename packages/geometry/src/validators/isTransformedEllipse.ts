import { isEllipse } from "./isEllipse";
import { isTransform } from "./isTransform";
import type { TransformedEllipse } from "../types/TransformedEllipse";

/** Type guard for {@link TransformedEllipse}. */
export const isTransformedEllipse = (
	obj: unknown,
): obj is TransformedEllipse => {
	return isEllipse(obj) && isTransform(obj);
};
