import type { EventPhase } from "./EventPhase";

/**
 * Event fired during diagram dragging operations
 */
export type DiagramDragEvent = {
	eventId: string;
	eventPhase: EventPhase;
	id: string;
	/** The diagram's x position at the start of the drag */
	startX: number;
	/** The diagram's y position at the start of the drag */
	startY: number;
	/** The diagram's x position at the end of the drag */
	endX: number;
	/** The diagram's y position at the end of the drag */
	endY: number;
	/** The cursor's x position at the start of the drag (in SVG coordinates) */
	cursorX: number;
	/** The cursor's y position at the start of the drag (in SVG coordinates) */
	cursorY: number;
	/** The canvas's min x position */
	minX?: number;
	/** The canvas's min y position */
	minY?: number;
};
