import type { EventPhase } from "./EventPhase";
import type { ExecutionPayload } from "./ExecutionPayload";

/**
 * Event fired when a diagram executes an operation
 */
export type ExecuteEvent<T = unknown> = {
	eventId: string;
	eventPhase: EventPhase;
	id: string;
	payload: ExecutionPayload<T>;
};
