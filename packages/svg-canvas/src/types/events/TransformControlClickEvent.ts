/**
 * Event fired when a transform control (DragLine or DragPoint) is clicked.
 * This event is emitted via EventBus to allow shapes to respond to clicks
 * on their transform controls without tight coupling.
 */
export type TransformControlClickEvent = {
	eventId: string;
	id: string;
	clientX: number;
	clientY: number;
};
