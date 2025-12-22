import type { EventPhase } from "./EventPhase";
import type { Frame } from "../core/Frame";
/**
 * Event fired during diagram transformation operations such as resizing or rotating.
 * Contains information about the element's shape before and after transformation.
 */
export type DiagramTransformEvent = {
	eventId: string;
	id: string;
	eventPhase: EventPhase;
	startFrame: Frame;
	endFrame: Frame;
	cursorX: number;
	cursorY: number;
	minX?: number;
	minY?: number;
};
