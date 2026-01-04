import type { TransformedFrame } from "@workspace/geometry";

import type { EventPhase } from "./EventPhase";
/**
 * Event fired during diagram transformation operations such as resizing or rotating.
 * Contains information about the element's shape before and after transformation.
 */
export type DiagramTransformEvent = {
	eventId: string;
	id: string;
	eventPhase: EventPhase;
	startFrame: TransformedFrame;
	endFrame: TransformedFrame;
	cursorX: number;
	cursorY: number;
	minX?: number;
	minY?: number;
};
