import type { EventPhase } from "./EventPhase";

/**
 * Event fired during area selection operations
 */
export type AreaSelectionEvent = {
	eventId: string;
	eventPhase: EventPhase;
	clientX: number;
	clientY: number;
};
