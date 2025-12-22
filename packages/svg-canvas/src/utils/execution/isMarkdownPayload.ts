import { hasContentType } from "./hasContentType";
import { isTextPayload } from "./isTextPayload";
import type { ExecutionPayload } from "../../types/events/ExecutionPayload";
/**
 * Type guard to check if payload is markdown
 */
export const isMarkdownPayload = (payload: ExecutionPayload): boolean => {
	return isTextPayload(payload) && hasContentType(payload, "markdown");
};
