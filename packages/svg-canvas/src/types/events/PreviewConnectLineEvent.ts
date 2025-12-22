import type { EventPhase } from "./EventPhase";
import type { PathState } from "../state/shapes/PathState";

/**
 * Event that represents a preview connection line state change.
 * This event is triggered when the preview connection line should be shown, updated, or hidden.
 */
export type PreviewConnectLineEvent = {
	id: string; // ConnectPoint id
	x: number; // The x coordinate of the ConnectPoint in canvas space.
	y: number; // The y coordinate of the ConnectPoint in canvas space.
	ownerId: string; // The ID of the ConnectPoint that owns this event.
	/**
	 * The type of event that triggered this preview connection line event.
	 */
	eventPhase: EventPhase;
	/**
	 * The path data for the preview connection line.
	 * When undefined, the preview line should be hidden.
	 */
	pathData?: PathState;

	minX?: number;
	minY?: number;
};
