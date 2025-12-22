import { hasContentType } from "./hasContentType";
import { isTextPayload } from "./isTextPayload";
import type { ExecutionPayload } from "../../types/events/ExecutionPayload";

type TextPlainPayload = ExecutionPayload & {
	format: "text";
	data: string;
	metadata: {
		contentType: "plain";
	};
};

/**
 * Type guard to check if payload is plain text
 */
export const isPlainTextPayload = (
	payload: ExecutionPayload,
): payload is TextPlainPayload => {
	return isTextPayload(payload) && hasContentType(payload, "plain");
};
