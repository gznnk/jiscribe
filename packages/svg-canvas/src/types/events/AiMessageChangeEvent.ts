import type { EventPhase } from "./EventPhase";

/**
 * Event for AI message change
 */
export type AiMessageChangeEvent = {
	/** Diagram ID */
	id: string;
	/** Event ID */
	eventId: string;
	/** Event phase */
	eventPhase: EventPhase;
	/** Updated AI message */
	aiMessage: string;
};
