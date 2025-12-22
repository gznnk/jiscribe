import type { ExecutionPayload } from "../../types/events/ExecutionPayload";

type ObjectPayload = ExecutionPayload & {
	data: object;
};

/**
 * Type guard to check if payload format is object
 */
export const isObjectPayload = (
	payload: ExecutionPayload,
): payload is ObjectPayload => {
	return payload.format === "object";
};
