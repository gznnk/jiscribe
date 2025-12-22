import type { Diagram } from "../state/core/Diagram";

/**
 * Event for extracting specified diagrams to the top level.
 * This is triggered when items are dragged out of a CanvasFrame and dropped outside.
 */
export type ExtractDiagramsToTopLevelEvent = {
	eventId: string;
	diagrams: Diagram[];
};
