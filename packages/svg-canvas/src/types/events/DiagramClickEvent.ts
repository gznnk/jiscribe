/**
 * Event fired when a diagram is clicked
 */
export type DiagramClickEvent = {
	eventId: string;
	id: string;
	isSelectedOnPointerDown: boolean;
	isAncestorSelectedOnPointerDown: boolean;
	clientX: number;
	clientY: number;
};
