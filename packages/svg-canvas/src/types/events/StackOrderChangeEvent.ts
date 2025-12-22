import type { StackOrderChangeType } from "./StackOrderChangeType";

/**
 * Event for changing the z-index (stack order) of a diagram
 */
export type StackOrderChangeEvent = {
	eventId: string;
	id: string;
	changeType: StackOrderChangeType;
};
