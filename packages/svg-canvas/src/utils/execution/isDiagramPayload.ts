import type { ExecutionPayload } from "../../types/events/ExecutionPayload";

/**
 * Type guard to check if payload format is diagram
 */
export const isDiagramPayload = (payload: ExecutionPayload): boolean => {
	return payload.format === "diagram";
};
