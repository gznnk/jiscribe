import type { Diagram } from "../state/core/Diagram";

/**
 * Event for appending multiple diagrams to a target diagram via drag and drop.
 * Contains the target ID and the diagrams to be appended.
 * Diagrams are assumed to have absolute coordinates.
 */
export type AppendDiagramsEvent = {
	eventId: string;
	targetId: string;
	diagrams: Diagram[];
};
