import type { ExecutionPayload } from "../../types/events/ExecutionPayload";

/**
 * Type guard to check if payload format is binary
 */
export const isBinaryPayload = (payload: ExecutionPayload): boolean => {
	return payload.format === "binary";
};
