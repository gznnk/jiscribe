import type { ExecutionPayload } from "../../types/events/ExecutionPayload";

/**
 * Type guard to check if payload format is error
 */
export const isErrorPayload = (payload: ExecutionPayload): boolean => {
	return payload.format === "error";
};
