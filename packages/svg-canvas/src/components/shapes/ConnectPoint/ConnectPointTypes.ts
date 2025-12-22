import type { Frame } from "../../../types/core/Frame";

export type ConnectionEventType = "connecting" | "connect" | "disconnect";

export type ConnectionEvent = {
	eventId: string;
	type: ConnectionEventType;
	startPointId: string;
	startX: number;
	startY: number;
	endPointId: string;
	endX: number;
	endY: number;
	endOwnerId: string;
	endOwnerFrame: Frame;
};

export type ConnectingPoint = {
	id: string;
	x: number;
	y: number;
	onwerId: string;
	ownerFrame: Frame;
};
