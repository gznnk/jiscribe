import { isFrame } from "./isFrame";
import { isTransform } from "./isTransform";
import type { TransformedFrame } from "../types/TransformedFrame";

/** Type guard for {@link TransformedFrame}. */
export const isTransformedFrame = (obj: unknown): obj is TransformedFrame => {
	return isFrame(obj) && isTransform(obj);
};
