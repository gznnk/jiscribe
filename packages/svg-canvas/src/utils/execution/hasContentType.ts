import type { ExecutionPayload } from "../../types/events/ExecutionPayload";
import type { PayloadContentType } from "../../types/events/PayloadContentType";

/**
 * Type guard to check if payload has specific content type
 */
export const hasContentType = (
	payload: ExecutionPayload,
	contentType: PayloadContentType,
): boolean => {
	return payload.metadata?.contentType === contentType;
};
