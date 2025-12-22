import type { ConnectLineData } from "../data/shapes/ConnectLineData";

/**
 * Event fired when a connect line should flash
 */
export type FlashConnectLineEvent = {
	eventId: string;
	data: ConnectLineData;
};
