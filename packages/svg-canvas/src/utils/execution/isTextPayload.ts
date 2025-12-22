import type { ExecutionPayload } from "../../types/events/ExecutionPayload";

type TextPayload = ExecutionPayload & {
	data: string;
};

/**
 * Type guard to check if payload format is text
 */
export const isTextPayload = (
	payload: ExecutionPayload,
): payload is TextPayload => {
	return payload.format === "text" && typeof payload.data === "string";
};
