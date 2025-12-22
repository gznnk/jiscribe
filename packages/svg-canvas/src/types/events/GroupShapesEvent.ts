/**
 * Event fired when grouping multiple shapes by their IDs
 */
export type GroupShapesEvent = {
	eventId: string;
	shapeIds: string[];
	groupId: string;
	name?: string;
	description?: string;
};
