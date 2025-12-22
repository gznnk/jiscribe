import type { PathPointData } from "../data/shapes/PathPointData";

/**
 * Event fired when connecting two diagrams
 */
export type DiagramConnectEvent = {
	eventId: string;
	startOwnerId: string;
	points: PathPointData[];
	endOwnerId: string;
};
