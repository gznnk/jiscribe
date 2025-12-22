import type { EventPhase } from "./EventPhase";
import type { Diagram } from "../state/core/Diagram";

/**
 * Data structure for diagram change events
 */
export type DiagramChangeData<T = unknown> = Partial<Diagram & T>;

/**
 * Event fired when a diagram's properties are changed
 */
export type DiagramChangeEvent<T = unknown> = {
	eventId: string;
	eventPhase: EventPhase;
	id: string;
	startDiagram: DiagramChangeData<T>;
	endDiagram: DiagramChangeData<T>;
	cursorX?: number;
	cursorY?: number;
	/** The canvas's min x position */
	minX?: number;
	/** The canvas's min y position */
	minY?: number;
};
