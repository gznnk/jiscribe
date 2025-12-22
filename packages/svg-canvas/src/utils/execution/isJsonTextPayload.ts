import { hasContentType } from "./hasContentType";
import { isTextPayload } from "./isTextPayload";
import type { ExecutionPayload } from "../../types/events/ExecutionPayload";

/**
 * Type guard to check if payload is JSON text
 */
export const isJsonTextPayload = (payload: ExecutionPayload): boolean => {
	return isTextPayload(payload) && hasContentType(payload, "json");
};
