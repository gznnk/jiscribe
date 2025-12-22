import type { Diagram } from "../state/core/Diagram";

/**
 * Event for adding a new diagram to the canvas.
 */
export type AddDiagramEvent = {
	eventId: string;
	item: Diagram;
};
