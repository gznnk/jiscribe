/**
 * Event fired when a diagram element is selected or deselected.
 * Contains information about the selection state and whether multiple elements are being selected.
 */
export type DiagramSelectEvent = {
	eventId: string;
	id: string;
	isTriggeredByClick?: boolean;
	isSelectedOnPointerDown?: boolean;
	isAncestorSelectedOnPointerDown?: boolean;
};
