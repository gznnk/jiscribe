import type { DiagramType } from "../core/DiagramType";

/**
 * Event fired when a diagram is dragged and dropped onto another element.
 * Contains data about both the dragged element and the target element.
 * Used for implementing interactions between diagram components.
 */
export type DiagramDragDropEvent = {
	eventId: string;
	dropItem: {
		id: string;
		type?: DiagramType;
		x: number;
		y: number;
	};
	dropTargetItem: {
		id: string;
		type?: DiagramType;
		x: number;
		y: number;
	};
	/** Optional flag to show ghost image when drag leaves the drop target */
	showGhost?: boolean;
};
