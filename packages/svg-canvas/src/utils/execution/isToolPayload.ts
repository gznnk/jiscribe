import type { ExecutionPayload } from "../../types/events/ExecutionPayload";

/**
 * Type guard to check if payload format is tool
 */
export const isToolPayload = (payload: ExecutionPayload): boolean => {
	return payload.format === "tool";
};
