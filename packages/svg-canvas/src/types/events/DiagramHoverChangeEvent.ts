/**
 * Event fired when hovering over or leaving a diagram element.
 * Used to track mouse hover state for visual feedback and interactions.
 */
export type DiagramHoverChangeEvent = {
	eventId: string;
	id: string;
	isHovered: boolean;
};
