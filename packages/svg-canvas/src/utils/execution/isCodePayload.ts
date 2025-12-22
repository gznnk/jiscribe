import { hasContentType } from "./hasContentType";
import { isTextPayload } from "./isTextPayload";
import type { ExecutionPayload } from "../../types/events/ExecutionPayload";

/**
 * Type guard to check if payload is code
 */
export const isCodePayload = (payload: ExecutionPayload): boolean => {
	return isTextPayload(payload) && hasContentType(payload, "code");
};
