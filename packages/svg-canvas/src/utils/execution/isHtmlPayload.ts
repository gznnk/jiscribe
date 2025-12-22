import { hasContentType } from "./hasContentType";
import { isTextPayload } from "./isTextPayload";
import type { ExecutionPayload } from "../../types/events/ExecutionPayload";

/**
 * Type guard to check if payload is HTML
 */
export const isHtmlPayload = (payload: ExecutionPayload): boolean => {
	return isTextPayload(payload) && hasContentType(payload, "html");
};
