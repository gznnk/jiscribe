import type { EventPhase } from "./EventPhase";
import type { ExecutionPayload } from "./ExecutionPayload";

/**
 * Event for propagating execution results between connected nodes
 */
export type ExecutionPropagationEvent<T = unknown> = {
	eventId: string;
	eventPhase: EventPhase;
	id: string;
	targetId: string[];
	payload: ExecutionPayload<T>;
};
