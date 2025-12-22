import type { Diagram } from "../state/core/Diagram";

/**
 * Data structure for diagram update events
 */
export type DiagramUpdateData<T = unknown> = Partial<Diagram & T>;

/**
 * Event fired when a diagram's properties are updated programmatically.
 * Unlike DiagramChangeEvent, this event does not have an eventPhase
 * and is intended for direct, non-interactive updates such as
 * programmatic changes or updates from external APIs.
 */
export type DiagramUpdateEvent<T = unknown> = {
	eventId: string;
	id: string;
	data: DiagramUpdateData<T>;
	skipHistory?: boolean;
};
